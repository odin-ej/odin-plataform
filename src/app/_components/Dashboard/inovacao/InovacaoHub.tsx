"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Lightbulb,
  Zap,
  TrendingUp,
  Clock,
  FileCheck,
  Archive,
  ArrowRight,
  ChevronRight,
  Activity,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FullInovationInitiative } from "./InovationCard";

interface InovacaoHubProps {
  initiatives: FullInovationInitiative[];
}

const STATUS_MAP: Record<string, string> = {
  RUNNING: "Rodando",
  APPROVED: "Aprovado",
  PENDING: "Pendente",
  REJECTED: "Rejeitado",
};

const STATUS_COLORS: Record<string, string> = {
  RUNNING: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  APPROVED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function InovacaoHub({ initiatives }: InovacaoHubProps) {
  const stats = useMemo(() => {
    const total = initiatives.length;
    const running = initiatives.filter((i) => i.status === "RUNNING").length;
    const pending = initiatives.filter((i) => i.status === "PENDING").length;
    const approved = initiatives.filter((i) => i.status === "APPROVED").length;
    return { total, running, pending, approved };
  }, [initiatives]);

  const featuredInitiatives = useMemo(() => {
    const fixed = initiatives.filter((i) => i.isFixed);
    const runningNonFixed = initiatives.filter(
      (i) => i.status === "RUNNING" && !i.isFixed
    );
    return [...fixed, ...runningNonFixed].slice(0, 5);
  }, [initiatives]);

  const recentActivity = useMemo(() => {
    return [...initiatives]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5);
  }, [initiatives]);

  return (
    <div className="min-h-screen space-y-8 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-[#0126fb]/20 to-[#f5b719]/20 border border-amber-400/20">
          <Lightbulb className="h-7 w-7 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            Espaço de Inovação
          </h1>
          <p className="text-sm text-gray-400">
            Hub central de inovacao da Casinha
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCard
          icon={<Lightbulb className="h-5 w-5" />}
          label="Total Iniciativas"
          value={stats.total}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-400"
          gradientFrom="from-amber-500/5"
        />
        <StatsCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Em Andamento"
          value={stats.running}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-400"
          gradientFrom="from-emerald-500/5"
        />
        <StatsCard
          icon={<Clock className="h-5 w-5" />}
          label="Pendentes de Revisao"
          value={stats.pending}
          iconBg="bg-[#0126fb]/10"
          iconColor="text-[#5b8aff]"
          gradientFrom="from-[#0126fb]/5"
        />
        <StatsCard
          icon={<Archive className="h-5 w-5" />}
          label="Ideias no Basement"
          value={0}
          iconBg="bg-[#f5b719]/10"
          iconColor="text-[#f5b719]"
          gradientFrom="from-[#f5b719]/5"
        />
      </div>

      {/* Featured Carousel */}
      {featuredInitiatives.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Destaques</h2>
          <div className="px-12">
            <Carousel
              opts={{ align: "start", loop: featuredInitiatives.length > 1 }}
              className="w-full"
            >
              <CarouselContent>
                {featuredInitiatives.map((initiative) => (
                  <CarouselItem
                    key={initiative.id}
                    className="md:basis-1/2 lg:basis-1/2"
                  >
                    <FeaturedSlide initiative={initiative} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="border-amber-400/30 bg-[#010d26] text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 -left-10" />
              <CarouselNext className="border-amber-400/30 bg-[#010d26] text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 -right-10" />
            </Carousel>
          </div>
        </div>
      )}

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Iniciativas Inovadoras Card */}
        <Link href="/inovacao/iniciativas" className="group block">
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-[#010d26] p-6 transition-all duration-300 hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(251,191,36,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500 blur-[20px] opacity-20 rounded-full" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <Lightbulb className="h-6 w-6 text-amber-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Iniciativas Inovadoras
                  </h3>
                  <p className="text-xs text-gray-400">
                    Projetos de transformacao, pilulas de conhecimento, eventos e
                    operacoes do nucleo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                  <FileCheck className="h-3.5 w-3.5" />
                  {stats.approved} aprovadas
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0126fb]/10 px-3 py-1 text-xs font-medium text-[#5b8aff]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {stats.running} em andamento
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="inline-flex items-center gap-2 rounded-xl bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-400 transition-colors group-hover:bg-amber-400/20">
                  Explorar Iniciativas
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* JR Basement Card */}
        <Link href="/inovacao/jr-basement" className="group block">
          <div className="relative overflow-hidden rounded-2xl border border-[#f5b719]/30 bg-[#010d26] p-6 transition-all duration-300 hover:border-[#f5b719]/60 hover:shadow-[0_0_30px_rgba(245,183,25,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#f5b719]/5 to-transparent" />
            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#f5b719] blur-[20px] opacity-20 rounded-full" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#f5b719]/10">
                    <Zap className="h-6 w-6 text-[#f5b719]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">JR Basement</h3>
                  <p className="text-xs text-gray-400">
                    Repositorio de ideias. Registre, estruture e veja sua
                    proposta ser avaliada pelo nucleo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5b719]/10 px-3 py-1 text-xs font-medium text-[#f5b719]">
                  <Lightbulb className="h-3.5 w-3.5" />0 ideias registradas
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="inline-flex items-center gap-2 rounded-xl bg-[#f5b719]/10 px-4 py-2 text-sm font-semibold text-[#f5b719] transition-colors group-hover:bg-[#f5b719]/20">
                  Acessar Basement
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">
            Atividade Recente
          </h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#010d26] overflow-hidden">
          {recentActivity.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              Nenhuma atividade recente
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentActivity.map((initiative) => (
                <div
                  key={initiative.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.02]"
                >
                  <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarImage src={initiative.author.imageUrl} />
                    <AvatarFallback className="bg-[#00205e] text-white text-xs">
                      {initiative.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      <span className="font-medium">
                        {initiative.author.name}
                      </span>{" "}
                      <span className="text-gray-400">
                        {initiative.status === "APPROVED"
                          ? "teve sua iniciativa aprovada"
                          : initiative.status === "RUNNING"
                          ? "iniciou"
                          : initiative.status === "PENDING"
                          ? "enviou para revisao"
                          : "atualizou"}
                      </span>{" "}
                      <span className="font-medium text-gray-300">
                        {initiative.title}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(initiative.updatedAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  <Badge
                    className={`text-[10px] border ${
                      STATUS_COLORS[initiative.status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    }`}
                  >
                    {STATUS_MAP[initiative.status] ?? initiative.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatsCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
  gradientFrom,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
  gradientFrom: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#010d26] p-4">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} to-transparent`}
      />
      <div className="relative space-y-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
        <div>
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FeaturedSlide({
  initiative,
}: {
  initiative: FullInovationInitiative;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#010d26] h-64 group/slide">
      {/* Background image or gradient */}
      {initiative.imageUrl ? (
        <Image
          src={initiative.imageUrl}
          alt={initiative.title}
          fill
          className="object-cover opacity-30 transition-transform duration-500 group-hover/slide:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#00205e] to-[#010d26]" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#010d26] via-[#010d26]/70 to-transparent" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-end p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              className={`text-[10px] border ${
                STATUS_COLORS[initiative.status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"
              }`}
            >
              {STATUS_MAP[initiative.status] ?? initiative.status}
            </Badge>
            {initiative.isFixed && (
              <Badge className="bg-amber-400/20 text-amber-400 border border-amber-400/30 text-[10px]">
                Destaque
              </Badge>
            )}
          </div>

          <h3 className="text-lg font-bold text-white line-clamp-1">
            {initiative.title}
          </h3>

          <p className="text-xs text-gray-400 line-clamp-2">
            {initiative.shortDescription}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <Avatar className="h-6 w-6 border border-white/10">
              <AvatarImage src={initiative.author.imageUrl} />
              <AvatarFallback className="bg-[#00205e] text-white text-[10px]">
                {initiative.author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-300">
              {initiative.author.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
