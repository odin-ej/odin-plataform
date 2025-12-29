"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FullUser } from "@/lib/server-utils";
import { Trash2, UserPen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CasinhaWinnerCardProps {
  winner: FullUser;
  title: string;
  date: string;
  imageUrl?: string;
  authorName?: string;
  isDirector?: boolean;
  onDelete?: () => void;
  className?: string;
}

const CasinhaWinnerCard = ({
  winner,
  title,
  date,
  imageUrl,
  authorName,
  isDirector,
  onDelete,
  className,
}: CasinhaWinnerCardProps) => {
  
  // Formatação de data brasileira (DD/MM/YYYY)
  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(date);
      return new Intl.DateTimeFormat("pt-BR").format(d);
    } catch {
      return date;
    }
  }, [date]);

  return (
    <div
      className={cn(
        // Efeito 3D: Perspective + Rotate + Shadow dinâmica
        "relative group w-full max-w-[320px] aspect-[4/5.5] rounded-[2rem] overflow-hidden",
        "bg-gradient-to-b from-[#011640] to-[#010d26]",
        "border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
        "transition-all duration-500 ease-out",
        "hover:scale-[1.03] hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(1,38,251,0.3)]",
        "perspective-1000",
        "rounded-2xl",
        className
      )}
    >
      {/* BOTÃO DELETAR (Apenas Diretores) */}
      {isDirector && (
        <Button
          variant="destructive"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className="absolute top-4 right-4 z-[40] h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/20 hover:bg-red-500 backdrop-blur-md border border-red-500/50"
        >
          <Trash2 size={14} className="text-white" />
        </Button>
      )}

      {/* Background: Imagem da Casinha */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/casinha.png"
          alt="Casinha background"
          fill
          className="object-cover opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#010d26] via-[#010d26]/40 to-transparent" />
      </div>

      {/* Conteúdo Central */}
      <div className="relative z-10 h-full flex flex-col items-center p-8 text-center">
        
        {/* Camada de Profundidade do Avatar */}
        <div className="relative mt-4 mb-6">
          {/* Brilhos e Auras */}
          <div className="absolute inset-0 bg-[#0126fb] blur-[40px] opacity-30 rounded-full scale-150 group-hover:opacity-50 transition-opacity" />
          <div className="absolute -inset-1 bg-gradient-to-tr from-[#f5b719] to-transparent rounded-full opacity-20 group-hover:opacity-40 animate-spin-slow" />
          
          <Avatar className="h-40 w-40 border-[6px] border-[#f5b719] shadow-[0_10px_30px_rgba(245,183,25,0.3)] relative z-10">
            <AvatarImage src={winner.imageUrl} className="object-cover" />
            <AvatarFallback className="bg-gray-800 text-3xl font-black">
              {winner.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
        </div>

        {/* Informações do Vencedor */}
        <div className="space-y-1 relative z-99">
          <h4 className="text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase italic tracking-tighter">
            {winner.name.split(" ")[0]} {winner.name.split(" ")[1] || ""}
          </h4>
          <p className="text-[#f5b719] text-xs font-black uppercase tracking-[0.2em] bg-[#f5b719]/10 py-1 px-3 rounded-lg border border-[#f5b719]/20">
            {title || "Casinha do Valor"}
          </p>
        </div>

        {/* Rodapé: Metadata Discreta */}
        <div className="mt-auto w-full flex flex-col items-center gap-2 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
             <span className="flex items-center gap-1">
               <UserPen size={10} className="text-[#0126fb]" />
               Atribuído por: <span className="text-blue-200">{authorName || "Diretoria"}</span>
             </span>
          </div>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Registro do Momento (Hover Overlay) */}
      {imageUrl && (
        <div className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
          <Image src={imageUrl} alt="Foto do momento" fill className="object-cover scale-110 group-hover:scale-100 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-0 right-0 px-6 text-center">
             <p className="text-white font-black italic uppercase text-lg drop-shadow-lg tracking-tighter">
               O Momento 📸
             </p>
             <p className="text-white/60 text-[10px] uppercase tracking-widest">Memória Registrada</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasinhaWinnerCard;