/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link2, User, Tag, Lightbulb, ImageIcon, Eye, Users } from "lucide-react";
import Image from "next/image";
import { FullInovationInitiative } from "./InovationCard";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface InnovationModalProps {
  data: FullInovationInitiative | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InnovationModal = ({
  data,
  isOpen,
  onClose,
}: InnovationModalProps) => {
  if (!data) return null;

  const getMemberRoleBySemester = (member: any) => {
    if (!member.roleHistory || member.roleHistory.length === 0) return null;
    
    const roleAtTime = member.roleHistory.find(
      (rh: any) => rh.semester === data.semester.name
    );

    return roleAtTime?.role?.name || null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="sr-only">{data.title}</DialogTitle>
      <DialogContent className="w-[80vw] max-w-4xl sm:max-w-4xl h-[90vh] overflow-y-auto bg-[#010d26] border-[#f5b719]/40 text-slate-200 p-0 gap-0 scrollbar-thin scrollbar-track-transparent">
        {/* Header Colorido */}
        <div className="bg-gradient-to-r from-blue-900 to-[#010d26] p-6 border-b border-white/10 sticky top-0 z-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">
                {data.title}
              </h2>
              <p className="text-[#f5b719] text-sm font-medium mt-1 uppercase tracking-wider">
                Iniciativa Inovadora • {data.semester.name}
              </p>
            </div>
            <Badge className="bg-[#f5b719] text-black hover:bg-[#f5b719]/80 text-sm px-4 py-1 uppercase">
              {data.status === "RUNNING" ? "Rodando" : data.status === 'APPROVED' ? 'Aprovado' : data.status === 'PENDING' ? 'Pendente' : data.status === 'REJECTED' ? 'Rejeitado' : data.status}
            </Badge>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Imagem Principal (Mockada) e Dados Principais */}
          <div className="flex flex-col gap-8">
            <div className="w-full bg-slate-800/50 rounded-xl overflow-hidden border border-white/10 min-h-[200px] flex items-center justify-center relative">
              {/* Placeholder de Imagem */}
              {data.imageUrl ? (
                <Image
                  src={data.imageUrl}
                  alt={data.title}
                  fill
                  className="w-full h-auto object-cover aspect-[16/9]"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <ImageIcon size={48} className="mb-2 opacity-50" />
                  <span className="text-xs uppercase">Sem Imagem de Capa</span>
                </div>
              )}
            </div>

            <div className="w-full space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-slate-400 text-xs mb-1">
                    Criado em:
                  </span>
                  <span className="font-mono text-white">
                    {format(data.createdAt, "dd/MM/yyyy")}
                  </span>
                </div>

                {data.dateChecked && (
                  <div>
                    <span className="block text-slate-400 text-xs mb-1">
                      Auditado em:
                    </span>
                    <span className="font-mono text-white">
                      {format(data.dateChecked, "dd/MM/yyyy")}
                    </span>
                  </div>
                )}

                {data.dateImplemented && (
                  <div>
                    <span className="block text-slate-400 text-xs mb-1">
                      Implementado em:
                    </span>
                    <span className="font-mono text-white">
                      {formatInTimeZone(data.dateImplemented, "America/Sao_Paulo", "dd/MM/yyyy")}
                    </span>
                  </div>
                )}

                {data.dateColected && (
                  <div>
                    <span className="block text-slate-400 text-xs mb-1">
                      Coletado em:
                    </span>
                    <span className="font-mono text-white">
                      {formatInTimeZone(data.dateColected, "America/Sao_Paulo", "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <span className="block text-slate-400 text-xs mb-2">
                  Descrição Completa:
                </span>
                <p className="text-sm leading-relaxed text-slate-300 bg-slate-900/40 p-4 rounded-lg border border-white/5">
                  {data.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <span className="block text-slate-400 text-xs mb-1">
                    Áreas Afetadas:
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {data.areas.map((area) => (
                      <Badge
                        key={area}
                        variant="secondary"
                        className="bg-blue-600/20 text-blue-300 hover:bg-blue-600/30"
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block text-slate-400 text-xs mb-1">
                    Subáreas Afetadas:
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {data.subAreas.map((area) => (
                      <Badge
                        key={area}
                        variant="secondary"
                        className="bg-blue-600/20 text-blue-300 hover:bg-blue-600/30"
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                {data.links.length > 0 && (
                  <div className="col-span-2">
                    <span className="block text-slate-400 text-xs mb-1">
                      Links Rápidos:
                    </span>
                    <div className="flex flex-col gap-1">
                      {data.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          className="text-[#f5b719] hover:underline text-xs flex items-center gap-1"
                        >
                          <Link2 size={12} /> {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Relacionamentos (Estilo Imagem 1) */}
          <div className="bg-[#0b1629] p-6 rounded-xl border border-white/5 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#f5b719]/10 rounded-full text-[#f5b719]">
                <Tag size={24} />
              </div>
              <div>
                <span className="text-[#f5b719] font-bold block">
                  Tags Relacionadas
                </span>
                <span className="text-xs text-slate-400">
                  {data.tags.join(", ")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-400/10 rounded-full text-blue-400">
                <User size={24} />
              </div>
              <div>
                <span className="text-blue-400 font-bold block">
                  Auditado Por
                </span>
                <span className="text-xs text-slate-400">
                  {data.reviewer?.name ?? "N/A"} | {data.reviewer?.roleHistory && data.reviewer?.roleHistory.length > 0 ? data.reviewer?.roleHistory.find((rh) => rh.semester === data.semester.name)?.role?.name ?? data.reviewer?.currentRole?.name ?? "Sem cargo" : data.reviewer?.currentRole?.name ?? "Sem cargo"}
                 </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-600/10 rounded-full text-purple-600">
                <Eye size={24} />
              </div>
              <div>
                <span className="text-purple-600 font-bold block">
                  Horizonte de Inovação
                </span>
                <span className="text-xs text-slate-400">
                  {data.inovationHorizon || "N/A"}
                 </span>
              </div>
            </div>

            {data.relatedTo.length > 0 && (
              <div className="col-span-2 flex items-center gap-4">
                <div className="p-3 bg-[#f5b719]/10 rounded-full text-[#f5b719]">
                  <Lightbulb size={36} />
                </div>
                <div>
                  <span className="text-[#f5b719] font-bold block">
                    Relacionado com
                  </span>
                  <span className="text-xs text-slate-400">
                    {data.relatedTo.map((rel) => rel.from.title).join(", ") ||
                      "Nenhum"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Seção Membros Envolvidos */}
         <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Users className="text-[#0126fb]" size={24} />
              <h3 className="text-xl font-bold text-white uppercase tracking-tighter italic">
                Membros Envolvidos
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.members?.map((member: any) => {
                const role = getMemberRoleBySemester(member);
                return (
                  <div 
                    key={member.id} 
                    className="group relative flex items-center gap-4 p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-[#0126fb]/50 transition-all hover:bg-[#0126fb]/5"
                  >
                    <div className="relative">
                      <Avatar className="h-14 w-14 border-2 border-[#0126fb]/30 group-hover:border-[#f5b719] transition-colors">
                        <AvatarImage src={member.imageUrl} className="object-cover" />
                        <AvatarFallback className="bg-[#010d26] text-[#f5b719]">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0126fb] rounded-full border-2 border-[#010d26]" />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white group-hover:text-[#f5b719] transition-colors line-clamp-1">
                        {member.name}
                      </span>
                      {role && (
                        <span className="text-[10px] uppercase font-black tracking-widest text-[#f5b719]/80">
                          {role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção S.O.C.I.O */}
          <div className="space-y-4 pt-4">
            <h3 className="text-center text-xl font-bold tracking-[0.2em] text-slate-400 mb-6 border-b border-white/10 pb-4">
              MÉTODO S.O.C.I.O
            </h3>

            {data.sentido && (
              <SocioCard letter="S" title="ENTIDO" description={data.sentido} />
            )}
            {data.organizacao && (
              <SocioCard
                letter="O"
                title="RGANIZAÇÃO"
                description={data.organizacao}
              />
            )}
            {data.cultura && (
              <SocioCard letter="C" title="ULTURA" description={data.cultura} />
            )}
            {data.influencia && (
              <SocioCard
                letter="I"
                title="NFLUÊNCIA"
                description={data.influencia}
              />
            )}
            {data.operacao && (
              <SocioCard
                letter="O"
                title="PERAÇÃO"
                description={data.operacao}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente auxiliar para os blocos SOCIO
const SocioCard = ({
  letter,
  title,
  description,
}: {
  letter: string;
  title: string;
  description: string;
}) => (
  <div className="flex items-stretch bg-slate-900/60 rounded-xl overflow-hidden border border-white/5 min-h-[80px]">
    <div className="bg-gradient-to-br from-[#f5b719]/80 to-amber-700 w-16 flex items-center justify-center shrink-0">
      <span className="text-4xl font-black text-white drop-shadow-md">
        {letter}
      </span>
    </div>
    <div className="p-4 flex flex-col justify-center">
      <h4 className="text-[#f5b719] font-bold text-xs uppercase mb-1 tracking-widest opacity-80">
        {letter}
        {title}
      </h4>
      <p className="text-sm text-slate-200">{description}</p>
    </div>
  </div>
);
