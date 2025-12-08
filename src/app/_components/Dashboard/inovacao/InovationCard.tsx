"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Lightbulb, EllipsisVertical, Pencil, Pin, Trash2, Megaphone } from "lucide-react";
import { Prisma } from "@prisma/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export type FullInovationInitiative = Prisma.InovationInitiativeGetPayload<{
  include: {
    author: {
      include: {
        currentRole: true;
        roleHistory: {
          include: {
            role: true;
          };
        };
      };
    };
    members: {
      include: {
        currentRole: true;
        roleHistory: {
          include: {
            role: true;
          };
        };
      };
    };
    relatedFrom: {
      include: {
        from: true;
        to: true;
      };
    };
    relatedTo: {
      include: {
        from: true;
        to: true;
      };
    };
    reviewer: {
      include: {
        currentRole: true;
        roleHistory: {
          include: {
            role: true;
          };
        };
      };
    };
    semester: true;
    links: true;
  };
}>;

interface InnovationCardProps {
  data: FullInovationInitiative;
  isManaging: boolean;
  userId: string;
  onClick: () => void;
  onAction: (action: string, data: FullInovationInitiative) => void;
}

export const InnovationCard = ({
  data,
  onClick,
  onAction,
  isManaging,
  userId,
}: InnovationCardProps) => {
  const roleShown =
    data.author.roleHistory?.find((rh) => rh.semester === data.semester.name)
      ?.role?.name ??
    data.author.currentRole?.name ??
    "Sem cargo";

  const isOwner = userId === data.author.id;

  return (
    <Card
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-[#020817] text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] cursor-pointer flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-amber-400/20">
        <h3 className="text-xl font-bold truncate pr-2">{data.title}</h3>
        <div className='flex gap-2 items-center justify-center flex-nowrap'>
          <Badge className="bg-amber-400 text-black hover:bg-amber-500 font-bold px-2 py-0.5 text-xs uppercase">
          {data.status === "RUNNING"
            ? "Rodando"
            : data.status === "APPROVED"
            ? "Aprovado"
            : data.status === "PENDING"
            ? "Pendente"
            : data.status === "REJECTED"
            ? "Rejeitado"
            : data.status}
        </Badge>

        <Popover>
          <PopoverTrigger
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <EllipsisVertical className="cursor-pointer" />
          </PopoverTrigger>
          <PopoverContent className="w-fit bg-[#010d26]  border-[#f5b719]">
            <div className="flex flex-col">
              {isManaging && (
                <Button
                  variant="ghost"
                  className='text-[#f5b719] hover:text-[#f5b719] hover:bg-white/10 transition-colors'
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("pin", data);
                  }}
                >
                  <Pin /> {data.isFixed ? "Desfixar" : "Fixar"}
                </Button>
              )}
              {(isManaging) && (
                <Button
                  variant="ghost"
                  className='text-[#f5b719] hover:text-[#f5b719] hover:bg-white/10 transition-colors'
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("review", data);
                  }}
                >
                  <Megaphone /> Auditar
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  className='text-[#f5b719] hover:text-[#f5b719] hover:bg-white/10 transition-colors'
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("edit", data);
                  }}
                >
                  <Pencil /> Editar
                </Button>
              )}
              {(isManaging || isOwner) && (
                  <Button
                    variant="ghost"
                    className='text-[#f5b719] hover:text-[#f5b719] hover:bg-white/10 transition-colors'
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction("delete", data);
                    }}
                  >
                    <Trash2 /> Deletar
                  </Button>
                )}
            </div>
          </PopoverContent>
        </Popover>
        </div>
      </div>

      {/* Ícone Central (Lâmpada) */}
      <CardContent className="flex flex-col items-center justify-center py-6 flex-grow relative">
        <div className="relative">
          {/* Efeito de Glow atrás da lâmpada */}
          <div className="absolute inset-0 bg-amber-500 blur-[60px] opacity-20 rounded-full" />
          <Lightbulb
            size={120}
            className="text-amber-200 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] z-10 relative transition-transform duration-500 group-hover:rotate-12"
            strokeWidth={1}
          />
        </div>

        <div className="mt-6 w-full px-2">
          <p className="text-xs text-slate-400 mb-1">Descrição curta:</p>
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 h-20 overflow-hidden">
            <p className="text-sm font-medium text-slate-200 line-clamp-3 leading-relaxed">
              {data.shortDescription}
            </p>
          </div>
        </div>
      </CardContent>

      {/* Footer / Autor */}
      <CardFooter className="flex flex-col items-start gap-4 border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 w-full">
          <Avatar className="h-10 w-10 border-2 border-amber-400/50">
            <AvatarImage src={data.author.imageUrl} />
            <AvatarFallback className="bg-slate-800 text-amber-400">
              {data.author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">
              {data.author.name}
            </span>
            <span className="text-xs text-amber-400">{roleShown}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full mt-2">
          {data.tags.slice(0, 3).map((tag,index) => (
            <span
              key={tag+index}
              className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded-full font-bold"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="absolute bottom-2 right-3">
          <span className="text-[10px] font-bold text-amber-400/60">
            {data.semester.name}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};
