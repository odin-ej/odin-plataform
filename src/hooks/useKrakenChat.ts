"use client";

import { useState, useCallback, useRef } from "react";

interface KrakenMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId?: string;
  agentName?: string;
  agentColor?: string;
  cached?: boolean;
  templateUsed?: boolean;
  createdAt: string;
}

interface UseKrakenChatReturn {
  messages: KrakenMessage[];
  isLoading: boolean;
  isRouting: boolean;
  activeAgent: { id: string; name: string; color?: string } | null;
  conversationId: string | null;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  setConversationId: (id: string | null) => void;
  setMessages: (msgs: KrakenMessage[]) => void;
  clearError: () => void;
}

export function useKrakenChat(): UseKrakenChatReturn {
  const [messages, setMessages] = useState<KrakenMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [activeAgent, setActiveAgent] = useState<{
    id: string;
    name: string;
    color?: string;
  } | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      // Add user message optimistically
      const userMsg: KrakenMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: message.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setIsRouting(true);
      setError(null);

      // Abort previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetch("/api/kraken", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: message.trim(),
            conversationId,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || errorData.error || "Erro ao enviar mensagem"
          );
        }

        // Get conversation ID from header
        const newConversationId = response.headers.get(
          "X-Kraken-Conversation-Id"
        );
        if (newConversationId && !conversationId) {
          setConversationId(newConversationId);
        }

        // Read SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let assistantContent = "";
        let assistantMsgAdded = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);

              switch (event.type) {
                case "agent_start":
                  setIsRouting(false);
                  setActiveAgent({
                    id: event.agent || "",
                    name: event.data || "",
                    color: event.color,
                  });
                  break;

                case "token":
                  assistantContent += event.data;
                  if (!assistantMsgAdded) {
                    assistantMsgAdded = true;
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        content: assistantContent,
                        agentId: activeAgent?.id,
                        agentName: activeAgent?.name,
                        agentColor: activeAgent?.color,
                        createdAt: new Date().toISOString(),
                      },
                    ]);
                  } else {
                    setMessages((prev) => {
                      const updated = [...prev];
                      const lastMsg = updated[updated.length - 1];
                      if (lastMsg && lastMsg.role === "assistant") {
                        updated[updated.length - 1] = {
                          ...lastMsg,
                          content: assistantContent,
                        };
                      }
                      return updated;
                    });
                  }
                  break;

                case "done":
                  break;

                case "error":
                  setError(event.data);
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Erro ao enviar mensagem"
        );
      } finally {
        setIsLoading(false);
        setIsRouting(false);
        abortControllerRef.current = null;
      }
    },
    [conversationId, isLoading, activeAgent]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    messages,
    isLoading,
    isRouting,
    activeAgent,
    conversationId,
    error,
    sendMessage,
    setConversationId,
    setMessages,
    clearError,
  };
}
