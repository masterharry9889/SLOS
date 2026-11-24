import { subscribeToChatStream } from '@/lib/sse';
import type { AgentId, ChatLevel } from '@/types';

export interface StreamChatParams {
  agentId: AgentId;
  level: ChatLevel;
  subjectId?: string;
  chapterId?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function streamAgentChat({
  agentId,
  level,
  subjectId,
  chapterId,
  messages,
  onToken,
  onDone,
  onError,
  signal,
}: StreamChatParams): Promise<void> {
  if (!subjectId) {
    throw new Error('Choose a subject before starting a chat.');
  }
  const latest = messages[messages.length - 1];
  if (!latest || latest.role !== 'user') {
    throw new Error('A user message is required to start a chat.');
  }

  await new Promise<void>((resolve, reject) => {
    const stream = subscribeToChatStream(
      {
        subject_id: subjectId,
        chapter_id: chapterId,
        message: latest.content,
        level,
        history: messages.slice(0, -1),
        agent_id: agentId,
      },
      {
        onToken,
        onCitation: () => undefined,
        onDone: () => {
          onDone();
          resolve();
        },
        onError: (message) => {
          onError(message);
          reject(new Error(message));
        },
      },
    );

    signal?.addEventListener('abort', () => {
      stream.close();
      resolve();
    }, { once: true });
  });
}
