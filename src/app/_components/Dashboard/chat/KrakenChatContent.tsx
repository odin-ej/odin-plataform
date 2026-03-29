"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Loader2,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Paperclip,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useKrakenChat } from "@/hooks/useKrakenChat";
import { useKrakenRateLimit } from "@/hooks/useKrakenRateLimit";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { KrakenIcon, AgentIcon } from "@/app/_components/Dashboard/kraken-icons/AgentIcons";

// --- Conversation list types ---
interface ConversationItem {
  id: string;
  title: string | null;
  createdAt: string;
  agent?: { id: string; displayName: string; color: string, iconUrl?: string } | null;
}

async function fetchConversations(): Promise<ConversationItem[]> {
  const res = await fetch("/api/kraken/conversations?page=1&pageSize=50");
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

// Quick commands — most common queries for cache optimization
const QUICK_COMMANDS = [
  { label: "Como criar um projeto?", text: "Como criar um projeto na plataforma Odin?" },
  { label: "OKRs atuais", text: "Quais são os OKRs atuais da empresa?" },
  { label: "Redigir email", text: "Me ajude a redigir um email profissional" },
  { label: "Resumir texto", text: "Resuma esse texto para mim" },
  { label: "Reservar sala", text: "Quero reservar uma sala para reunião" },
  { label: "Meus pontos", text: "Quantos JR Points eu tenho?" },
  { label: "Briefing de post", text: "Crie um briefing para post nas redes sociais" },
  { label: "Criar tarefa", text: "Crie uma tarefa para mim" },
  { label: "Minhas tarefas", text: "Quais são minhas tarefas pendentes?" },
];

export default function KrakenChatContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Fetch conversation list
  const { data: conversations = [] } = useQuery({
    queryKey: ["kraken-conversations"],
    queryFn: fetchConversations,
  });

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/kraken/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nova conversa" }),
      });
      if (!res.ok) throw new Error("Falha ao criar conversa");
      return res.json();
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["kraken-conversations"] });
      router.push(`/chat/${conv.id}`);
    },
  });

  // Delete conversation
  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/kraken/conversations/${id}`, { method: "DELETE" });
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["kraken-conversations"] });
      if (conversationId === deletedId) {
        const remaining = conversations.filter((c) => c.id !== deletedId);
        if (remaining.length > 0) {
          router.push(`/chat/${remaining[0].id}`);
        } else {
          createConversation.mutate();
        }
      }
    },
  });

  // Auto-scroll on new messages
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
    // Refresh conversation list (title may have changed)
    queryClient.invalidateQueries({ queryKey: ["kraken-conversations"] });
    // Refetch again after 3s to pick up AI-generated smart title
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["kraken-conversations"] });
    }, 3000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter((c) =>
    !searchQuery || (c.title ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      {/* Sidebar - Conversation History */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col border-r border-white/10 bg-[#010d26] overflow-hidden"
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
              <span className="text-sm font-semibold text-white">Conversas</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => createConversation.mutate()}
                  title="Nova conversa"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setSidebarOpen(false)}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar conversa..."
                  className="h-8 border-white/10 bg-white/5 pl-7 text-xs text-white placeholder:text-white/30 focus:border-[#0126fb]"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 scrollbar-thin">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors",
                    conv.id === conversationId
                      ? "bg-[#0126fb]/15 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                  onClick={() => router.push(`/chat/${conv.id}`)}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate text-xs">
                    {conv.title || "Nova conversa"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation.mutate(conv.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {filteredConversations.length === 0 && (
                <div className="py-8 text-center text-xs text-white/30">
                  Nenhuma conversa encontrada
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#010d26] px-4 py-2.5">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10 mr-1"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            {activeAgent?.iconUrl ? (
              <img src={activeAgent.iconUrl} alt={activeAgent.name} className="h-7 w-7 rounded-full object-cover border border-white/20" />
            ) : (
              <KrakenIcon size={28} color={activeAgent?.color || "#0126fb"} />
            )}
            <div>
              <h2 className="text-sm font-semibold text-white">
                {activeAgent ? activeAgent.name : "Kraken"}
              </h2>
              {activeAgent && (
                <span className="text-[10px] text-white/40">
                  respondendo...
                </span>
              )}
            </div>
          </div>
          {rateLimit && (
            <span className="rounded-full bg-[#0126fb]/10 border border-[#0126fb]/30 px-3 py-0.5 text-[10px] font-semibold text-[#0126fb]">
              {rateLimit.remaining}/{rateLimit.limit} perguntas
            </span>
          )}
        </div>

        {/* Messages area */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin"
          style={{ background: "linear-gradient(180deg, #00102e 0%, #010d26 100%)" }}
        >
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <KrakenIcon size={64} />
                <h3 className="text-xl font-bold text-white">
                  Olá{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Sou o Kraken, seu assistente inteligente. Posso ajudar com a plataforma,
                  documentos, estratégia, comunicação, dados e muito mais.
                </p>
                <p className="text-xs text-white/30 pt-2">
                  Use os comandos rápidos abaixo ou digite sua pergunta
                </p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  msg.agentIconUrl ? (
                    <img
                      src={msg.agentIconUrl}
                      alt={msg.agentName || "Agent"}
                      className="h-7 w-7 shrink-0 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <AgentIcon agentId={msg.agentId || "kraken_router"} size={28} color={msg.agentColor || "#0126fb"} />
                  )
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    msg.role === "user"
                      ? "bg-[#0126fb] text-white"
                      : "bg-[#010d26] border border-white/10 text-white"
                  )}
                >
                  {msg.role === "assistant" && msg.agentName && (
                    <span
                      className="mb-1 block text-[10px] font-semibold"
                      style={{ color: msg.agentColor || "#0126fb" }}
                    >
                      {msg.agentName}
                    </span>
                  )}
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none prose-a:text-[#0126fb] prose-strong:text-white prose-code:text-[#f5b719] text-sm leading-relaxed">
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

          {/* Routing indicator — pulsing dots instead of spinning robot */}
          {isRouting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <KrakenIcon size={28} />
              <div className="flex items-center gap-1.5 rounded-2xl bg-[#010d26] border border-white/10 px-4 py-2.5">
                <div className="flex gap-1">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#0126fb]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                  />
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#0126fb]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                  />
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#0126fb]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                  />
                </div>
                <span className="text-xs text-white/40 ml-1">Analisando...</span>
              </div>
            </motion.div>
          )}

          {/* Agent typing indicator */}
          {isLoading && !isRouting && activeAgent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              {activeAgent.iconUrl ? (
                <img src={activeAgent.iconUrl} alt={activeAgent.name} className="h-7 w-7 rounded-full object-cover border border-white/20" />
              ) : (
                <AgentIcon agentId={activeAgent.id} size={28} color={activeAgent.color || "#0126fb"} />
              )}
              <div className="flex items-center gap-2 rounded-2xl bg-[#010d26] border border-white/10 px-4 py-2.5">
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  style={{ color: activeAgent.color || "#0126fb" }}
                />
                <span className="text-xs text-white/40">
                  {activeAgent.name} digitando...
                </span>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-auto max-w-md rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="ml-2 h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>

        {/* Quick commands slider */}
   
        <div className="border-t border-white/10 bg-[#010d26] px-4 pt-2 pb-0">
          <div
            className="scrollbar-thin flex items-center gap-1.5 pb-2 overflow-x-auto"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#f5b719] shrink-0" />
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd.text}
                onClick={() => {
                  setInput(cmd.text);
                  textareaRef.current?.focus();
                }}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60 hover:bg-[#0126fb]/10 hover:text-white hover:border-[#0126fb]/30 transition-colors whitespace-nowrap"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-white/10 bg-[#010d26] px-4 py-2.5">
          {/* Attached files preview — inside input area for visibility */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-[#0126fb]/30 bg-[#0126fb]/10 px-3 py-2 text-xs text-white"
                >
                  <Paperclip className="h-3.5 w-3.5 text-[#0126fb]" />
                  <span className="max-w-[200px] truncate font-medium">{file.name}</span>
                  <span className="text-white/40">({(file.size / 1024).toFixed(0)} KB)</span>
                  <button
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="ml-1 rounded-full p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx,.csv,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files) {
                  setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                }
                e.target.value = "";
              }}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 shrink-0 text-white/40 hover:text-white hover:bg-white/10"
              title="Anexar arquivo"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte ao Kraken..."
              className="flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#0126fb]/50 min-h-[40px] max-h-[120px] transition-colors"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-10 w-10 rounded-xl bg-[#0126fb] hover:bg-[#0126fb]/80 text-white disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
