'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribeToChatStream } from '@/lib/sse';
import { getChatHistory } from '@/lib/api/endpoints';
import type { ChatMessage, ChatLevel, Citation } from '@/types';

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  level: ChatLevel;
  setLevel: (level: ChatLevel) => void;
  sendMessage: (content: string, overrideLevel?: ChatLevel) => Promise<void>;
  clearHistory: () => void;
  retryLastMessage: () => Promise<void>;
}

export function useChat(subjectId: string, chapterId?: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<ChatLevel>('simple');

  const activeStreamRef = useRef<{ close: () => void } | null>(null);
  const lastUserPromptRef = useRef<string | null>(null);

  // Fetch initial chat history
  useEffect(() => {
    let isCancelled = false;

    async function loadHistory() {
      if (!subjectId) return;
      setIsLoading(true);
      setError(null);
      try {
        const history = await getChatHistory(subjectId, chapterId);
        if (!isCancelled) {
          setMessages(Array.isArray(history) ? history : []);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          // If 404 or empty endpoint, initialize with empty array
          console.warn('Could not load chat history:', err);
          setMessages([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isCancelled = true;
      if (activeStreamRef.current) {
        activeStreamRef.current.close();
        activeStreamRef.current = null;
      }
    };
  }, [subjectId, chapterId]);

  // Clean up any ongoing stream on unmount
  useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.close();
        activeStreamRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string, overrideLevel?: ChatLevel) => {
      const text = content.trim();
      if (!text || isStreaming) return;

      const currentLevel = overrideLevel || level;
      lastUserPromptRef.current = text;
      setError(null);

      // Create optimistic user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        level: currentLevel,
        created_at: new Date().toISOString(),
      };

      // Create placeholder assistant message
      const assistantId = `asst-${Date.now() + 1}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        citations: [],
        level: currentLevel,
        created_at: new Date().toISOString(),
      };

      // Build history payload from current messages
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Update local state with both messages
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      // Close any previous stream
      if (activeStreamRef.current) {
        activeStreamRef.current.close();
        activeStreamRef.current = null;
      }

      try {
        const stream = subscribeToChatStream(
          {
            subject_id: subjectId,
            chapter_id: chapterId,
            message: text,
            level: currentLevel,
            history: historyPayload,
          },
          {
            onToken: (token: string) => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + token }
                    : msg
                )
              );
            },
            onCitation: (citation: Citation) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg;
                  const citations = msg.citations || [];
                  // Deduplicate citations by note_id and section
                  const exists = citations.some(
                    (c) =>
                      c.note_id === citation.note_id &&
                      c.section === citation.section &&
                      c.page === citation.page
                  );
                  if (exists) return msg;
                  return { ...msg, citations: [...citations, citation] };
                })
              );
            },
            onDone: () => {
              setIsStreaming(false);
              activeStreamRef.current = null;
            },
            onError: (errMessage: string) => {
              setIsStreaming(false);
              setError(errMessage);
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg;
                  if (!msg.content) {
                    return {
                      ...msg,
                      content:
                        'Sorry, I encountered an issue generating a response. Please verify your connection and try again.',
                    };
                  }
                  return msg;
                })
              );
              activeStreamRef.current = null;
            },
          }
        );

        activeStreamRef.current = stream;
      } catch (err: unknown) {
        setIsStreaming(false);
        const msg = err instanceof Error ? err.message : 'Failed to send message';
        setError(msg);
      }
    },
    [isStreaming, level, messages, subjectId, chapterId]
  );

  const retryLastMessage = useCallback(async () => {
    if (lastUserPromptRef.current && !isStreaming) {
      await sendMessage(lastUserPromptRef.current);
    }
  }, [isStreaming, sendMessage]);

  const clearHistory = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.close();
      activeStreamRef.current = null;
    }
    setIsStreaming(false);
    setError(null);
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    level,
    setLevel,
    sendMessage,
    clearHistory,
    retryLastMessage,
  };
}
