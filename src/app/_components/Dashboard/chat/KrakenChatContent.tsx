"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useKrakenChat } from "@/hooks/useKrakenChat";
import { useKrakenRateLimit } from "@/hooks/useKrakenRateLimit";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

export default function KrakenChatContent() {
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    isRouting,
    activeAgent,
    error,
    sendMessage,
    clearError,
  } = useKrakenChat();
  const { data: rateLimit } = useKrakenRateLimit();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Kraken IA</h2>
            {activeAgent && (
              <span
                className="text-xs"
                style={{ color: activeAgent.color || undefined }}
              >
                {activeAgent.name}
              </span>
            )}
          </div>
        </div>
        {rateLimit && (
          <Badge variant="outline" className="text-xs">
            {rateLimit.remaining}/{rateLimit.limit} perguntas hoje
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/10">
                <Bot className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium">Kraken IA</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Pergunte sobre a plataforma, documentos da empresa, estratégia,
                ou peça ajuda com comunicação e análise de dados.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: msg.agentColor
                      ? `${msg.agentColor}20`
                      : "#534AB720",
                  }}
                >
                  <Bot
                    className="h-4 w-4"
                    style={{ color: msg.agentColor || "#534AB7" }}
                  />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.role === "assistant" && msg.agentName && (
                  <div className="mb-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        borderColor: msg.agentColor || undefined,
                        color: msg.agentColor || undefined,
                      }}
                    >
                      {msg.agentName}
                    </Badge>
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Routing indicator */}
        {isRouting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            >
              <Bot className="h-5 w-5 text-purple-500" />
            </motion.div>
            <span>Kraken analisando sua pergunta...</span>
          </motion.div>
        )}

        {/* Agent processing indicator */}
        {isLoading && !isRouting && activeAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2
              className="h-4 w-4 animate-spin"
              style={{ color: activeAgent.color || "#534AB7" }}
            />
            <span>
              {activeAgent.name} respondendo...
            </span>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-2"
            >
              Fechar
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte ao Kraken..."
            className="flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px] max-h-[120px]"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 rounded-xl bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
