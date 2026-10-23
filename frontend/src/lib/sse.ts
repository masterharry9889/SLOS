import { Citation, SendChatRequest, SSEChatEvent, SSEJobEvent } from '@/types';
import { getAccessToken } from './api/client';

const API_BASE_URL = (
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined) ||
  'http://localhost:8000/api/v1'
).replace(/\/+$/, '');

export interface SSEConnectionOptions<T> {
  onMessage: (event: T) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: unknown;
}

/**
 * Creates an SSE stream connection using fetch and ReadableStream.
 * This supports custom headers (including Bearer Auth tokens) and POST payloads.
 */
export function createSSEConnection<T>(
  url: string,
  options: SSEConnectionOptions<T>
): { close: () => void } {
  const controller = new AbortController();
  const { signal } = controller;

  const fullUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;

  const token = getAccessToken();
  const requestHeaders: Record<string, string> = {
    Accept: 'text/event-stream',
    'Cache-Control': 'no-cache',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const method = options.method || 'GET';
  let bodyContent: BodyInit | undefined = undefined;

  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      bodyContent = options.body;
    } else {
      requestHeaders['Content-Type'] = 'application/json';
      bodyContent = JSON.stringify(options.body);
    }
  }

  (async () => {
    try {
      const response = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body: bodyContent,
        signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed with HTTP status ${response.status}: ${response.statusText}`);
      }

      options.onOpen?.();

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported by response');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Retain incomplete last line in buffer
        buffer = lines.pop() ?? '';

        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith(':')) {
            // Keepalive or comment line
            continue;
          }

          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim();
            if (dataStr === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              options.onMessage(parsed as T);
            } catch {
              options.onMessage(dataStr as unknown as T);
            }
          }
        }
      }
    } catch (err: unknown) {
      if (signal.aborted) {
        return; // Normal closure
      }
      const errorObj = err instanceof Error ? err : new Error(String(err));
      options.onError?.(errorObj);
    }
  })();

  return {
    close: () => {
      controller.abort();
    },
  };
}

/**
 * Subscribes to job progress and completion events via SSE.
 */
export function subscribeToJob(
  jobId: string,
  callbacks: {
    onProgress: (progress: number, step?: string) => void;
    onComplete: (result: unknown) => void;
    onError: (error: string) => void;
  }
): { close: () => void } {
  let isClosed = false;

  const connection = createSSEConnection<SSEJobEvent>(`/jobs/${encodeURIComponent(jobId)}/events`, {
    onMessage: (event) => {
      if (isClosed) return;

      if (event.type === 'job_progress') {
        callbacks.onProgress(event.progress ?? 0, event.current_step);
      } else if (event.type === 'job_completed') {
        callbacks.onComplete(event.result);
        isClosed = true;
        connection.close();
      } else if (event.type === 'job_failed') {
        callbacks.onError(event.error || 'Job failed');
        isClosed = true;
        connection.close();
      }
    },
    onError: (err) => {
      if (!isClosed) {
        callbacks.onError(err.message || 'Error listening to job events');
      }
    },
  });

  return {
    close: () => {
      isClosed = true;
      connection.close();
    },
  };
}

/**
 * Subscribes to AI Chat streaming tokens and citations via SSE.
 */
export function subscribeToChatStream(
  params: SendChatRequest,
  callbacks: {
    onToken: (token: string) => void;
    onCitation: (citation: Citation) => void;
    onDone: () => void;
    onError: (error: string) => void;
  }
): { close: () => void } {
  let isClosed = false;

  const connection = createSSEConnection<SSEChatEvent>('/chat/stream', {
    method: 'POST',
    body: params,
    onMessage: (event) => {
      if (isClosed) return;

      if (event.type === 'chat_token' && event.token) {
        callbacks.onToken(event.token);
      } else if (event.type === 'chat_citation' && event.citation) {
        callbacks.onCitation(event.citation);
      } else if (event.type === 'chat_done') {
        callbacks.onDone();
        isClosed = true;
        connection.close();
      } else if (event.type === 'chat_error') {
        callbacks.onError(event.error || 'Chat stream encountered an error');
        isClosed = true;
        connection.close();
      }
    },
    onError: (err) => {
      if (!isClosed) {
        callbacks.onError(err.message || 'Stream connection error');
      }
    },
  });

  return {
    close: () => {
      isClosed = true;
      connection.close();
    },
  };
}
