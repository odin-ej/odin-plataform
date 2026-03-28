"use client";

import { Zap, Trash2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IdeaWithRelations } from "./BasementContent";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/auth/AuthProvider";

const CLUSTER_STYLES: Record<number, { bg: string; border: string; text: string; label: string; accent: string; glowColor: string }> = {
  1: { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-400", label: "Embrionaria", accent: "#ef4444", glowColor: "rgba(239,68,68,0.12)" },
  2: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-400", label: "Em Desenvolvimento", accent: "#f97316", glowColor: "rgba(249,115,22,0.12)" },
  3: { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-400", label: "Madura", accent: "#3b82f6", glowColor: "rgba(59,130,246,0.12)" },
  4: { bg: "bg-[#f5b719]/20", border: "border-[#f5b719]/50", text: "text-[#f5b719]", label: "Pronta p/ Execucao", accent: "#f5b719", glowColor: "rgba(245,183,25,0.12)" },
};

const CATEGORY_LABELS: Record<string, string> = {
  PROCESSO: "Processo",
  PRODUTO: "Produto",
  TECNOLOGIA: "Tecnologia",
  CULTURA: "Cultura",
  OUTRO: "Outro",
};

interface IdeaCardProps {
  idea: IdeaWithRelations;
  rank?: number;
  onVote: (ideaId: string) => void;
  onSelect: (idea: IdeaWithRelations) => void;
  onDelete?: (ideaId: string) => void;
  isVoting?: boolean;
}

export default function IdeaCard({ idea, rank, onVote, onSelect, onDelete, isVoting }: IdeaCardProps) {
  const { user } = useAuth();
  const cluster = CLUSTER_STYLES[idea.clusterLevel] || CLUSTER_STYLES[1];
  const hasVoted = idea.votes.some((v: { userId: string }) => v.userId === user?.id);
  const isAuthor = idea.authorId === user?.id;
  const isTopRanked = rank !== undefined && rank <= 10;

  return (
    <div
      className="group relative flex flex-col bg-[#010d26] rounded-2xl border border-[#0126fb]/10 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
      style={{
        boxShadow: "0 0 0 0 transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 8px 32px ${cluster.glowColor}, 0 0 0 1px ${cluster.accent}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 0 0 0 transparent";
      }}
      onClick={() => onSelect(idea)}
    >
      {/* Left accent border strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: cluster.accent }}
      />

      {/* Card content */}
      <div className="flex flex-col flex-1 p-5 pl-6">

        {/* Top bar: rank + category */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {isTopRanked && (
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                <Zap className="w-3 h-3 text-[#f5b719] fill-[#f5b719]" />
                <span className="text-[#f5b719]">#{rank}</span>
              </div>
            )}
            <Badge variant="outline" className="text-[10px] border-[#0126fb]/30 text-[#0126fb] bg-[#0126fb]/8 px-2 py-0.5">
              {CATEGORY_LABELS[idea.category] || idea.category}
            </Badge>
          </div>

          {/* Delete button -- visible on hover */}
          {isAuthor && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(idea.id);
              }}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              title="Excluir ideia"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-[15px] leading-snug line-clamp-2 mb-2 group-hover:text-[#f5b719]/90 transition-colors duration-300">
          {idea.title}
        </h3>

        {/* Description */}
        <p className="text-gray-500 text-[13px] leading-relaxed line-clamp-3 mb-4 flex-1">
          {idea.description}
        </p>

        {/* Priority + Cluster section */}
        <div className="space-y-3 mb-4">
          {/* Priority bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                <TrendingUp className="w-3 h-3" />
                <span>SMART</span>
              </div>
              <span className="text-xs font-bold text-[#f5b719]">{idea.priorityScore}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(idea.priorityScore, 2)}%`,
                  background: `linear-gradient(90deg, #0126fb 0%, ${cluster.accent} 100%)`,
                }}
              />
            </div>
          </div>

          {/* Cluster badge */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: cluster.accent }}
            />
            <Badge className={cn("text-[10px] border py-0 h-5", cluster.bg, cluster.border, cluster.text)}>
              {cluster.label}
            </Badge>
          </div>
        </div>

        {/* Tags */}
        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {idea.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[#0126fb]/8 text-[#0126fb]/60 border border-[#0126fb]/15"
              >
                #{tag}
              </span>
            ))}
            {idea.tags.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 text-gray-600">
                +{idea.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: author + vote */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0126fb] to-[#0126fb]/50 flex items-center justify-center text-[11px] text-white font-bold uppercase flex-shrink-0 ring-2 ring-[#0126fb]/20">
              {idea.author.name?.charAt(0) || "?"}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-300 font-medium truncate max-w-[120px]">
                {idea.author.name}
              </p>
              <p className="text-[10px] text-gray-600">
                {formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Vote pill */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVote(idea.id);
            }}
            disabled={isVoting}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-300",
              hasVoted
                ? "bg-[#f5b719]/15 text-[#f5b719] border border-[#f5b719]/30 shadow-[0_0_12px_rgba(245,183,25,0.1)]"
                : "bg-white/[0.03] text-gray-500 border border-white/8 hover:border-[#f5b719]/30 hover:text-[#f5b719] hover:bg-[#f5b719]/5"
            )}
          >
            <Zap
              className={cn(
                "w-3.5 h-3.5 transition-all duration-300",
                hasVoted && "fill-[#f5b719] drop-shadow-[0_0_4px_rgba(245,183,25,0.4)]"
              )}
            />
            <span>{idea.votes.length}</span>
            <span className="hidden sm:inline">{idea.votes.length === 1 ? "voto" : "votos"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
