"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "next/navigation";

interface KrakenMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId?: string;
  agentName?: string;
  agentColor?: string;
  agentIconUrl?: string | Blob;
  cached?: boolean;
  templateUsed?: boolean;
  createdAt: string;
}

interface UseKrakenChatReturn {
  messages: KrakenMessage[];
  isLoading: boolean;
  isRouting: boolean;
  activeAgent: {
    iconUrl: string | Blob | undefined; id: string; name: string; color?: string 
} | null;
  conversationId: string | null;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  setConversationId: (id: string | null) => void;
  setMessages: (msgs: KrakenMessage[]) => void;
  clearError: () => void;
}

export function useKrakenChat(): UseKrakenChatReturn {
  const params = useParams();
  const urlConversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : (params.conversationId as string | undefined);

  const [messages, setMessages] = useState<KrakenMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [activeAgent, setActiveAgent] = useState<{
    id: string;
    name: string;
    color?: string;
    iconUrl: string | Blob | undefined;
  } | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    urlConversationId ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedConvRef = useRef<string | null>(null);

  // Sync conversationId from URL
  useEffect(() => {
    if (urlConversationId && urlConversationId !== conversationId) {
      setConversationId(urlConversationId);
    }
  }, [urlConversationId]);

  // Load existing messages when conversationId changes
  useEffect(() => {
    if (!conversationId || loadedConvRef.current === conversationId) return;
    loadedConvRef.current = conversationId;

    (async () => {
      try {
        const res = await fetch(`/api/kraken?conversationId=${conversationId}`);
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          const loaded: KrakenMessage[] = data.messages.map(
            (m: { id: string; role: string; content: string; agentId?: string; agent?: { displayName: string; color: string; iconUrl?: string }; createdAt: string }) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              agentId: m.agentId ?? undefined,
              agentName: m.agent?.displayName ?? undefined,
              agentColor: m.agent?.color ?? undefined,
              agentIconUrl: m.agent?.iconUrl ?? undefined,
              createdAt: m.createdAt,
            })
          );
          setMessages(loaded);
        }
      } catch {
        // Conversation may not exist yet — ignore
      }
    })();
  }, [conversationId]);

  // Track the latest activeAgent in a ref so the callback doesn't go stale
  const activeAgentRef = useRef(activeAgent);
  activeAgentRef.current = activeAgent;

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
        let currentAgent = activeAgentRef.current;

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
                  currentAgent = {
                    id: event.agent || "",
                    name: event.data || "",
                    color: event.color,
                    iconUrl: event.iconUrl,
                  };
                  setActiveAgent(currentAgent);
                  activeAgentRef.current = currentAgent;
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
                        agentId: currentAgent?.id,
                        agentName: currentAgent?.name,
                        agentColor: currentAgent?.color,
                        agentIconUrl: currentAgent?.iconUrl,
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

                case "action_executing":
                  // Show "executing action" indicator in chat
                  assistantContent += `\n\n⚡ *Executando: ${event.data?.toolName}...*\n`;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg && lastMsg.role === "assistant") {
                      updated[updated.length - 1] = { ...lastMsg, content: assistantContent };
                    }
                    return updated;
                  });
                  break;

                case "action_result": {
                  // Replace the "executing" text with the result
                  const icon = event.data?.success ? "✅" : "❌";
                  assistantContent = assistantContent.replace(
                    /\n\n⚡ \*Executando:.*?\*\n$/,
                    ""
                  );
                  assistantContent += `\n\n${icon} ${event.data?.message || "Ação concluída."}\n`;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg && lastMsg.role === "assistant") {
                      updated[updated.length - 1] = { ...lastMsg, content: assistantContent };
                    }
                    return updated;
                  });
                  break;
                }

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
    [conversationId, isLoading]
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
