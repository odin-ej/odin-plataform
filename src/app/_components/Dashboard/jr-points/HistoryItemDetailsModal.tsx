/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Paperclip,
  Tag,
  FileText,
  Flag,
  Calendar,
  User,
  ClipboardList,
  Users,
  PencilLine,
  Hash,
  Star,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  CircleUser,
  Building,
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

interface HistoryItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    type: "tag" | "solicitation" | "report";
    data: any;
  } | null;
}

// Componente de linha de detalhe redesenhado com ícone
const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-4 py-3 border-b border-[#00205e]/50">
    <div className="flex-shrink-0 text-[#f5b719] mt-1">{icon}</div>
    <div className="flex-grow">
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-base text-white mt-1">{value || "-"}</dd>
    </div>
  </div>
);

// Componente para o cabeçalho do modal
const ModalHeader = ({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) => (
  <DialogHeader className="flex flex-row items-center gap-4 p-6 bg-[#00205e]/50 border-b-2 border-[#0126fb]">
    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#0126fb]">
      {icon}
    </div>
    <div>
      <DialogTitle className="text-2xl font-bold text-white">
        {title}
      </DialogTitle>
    </div>
  </DialogHeader>
);

const HistoryItemDetailsModal = ({
  isOpen,
  onClose,
  item,
}: HistoryItemDetailsModalProps) => {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingSignedUrls, setLoadingSignedUrls] = useState(false);

  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (!item || !item.data.attachments?.length) {
        setSignedUrls({});
        return;
      }

      setLoadingSignedUrls(true);
      const urls: Record<string, string> = {};

      await Promise.all(
        item.data.attachments.map(async (file: any) => {
          try {
            // Supondo que 'file.url' contém a chave do S3
            const res = await axios.get(`/api/s3-get-signed-url`, {
              params: { key: file.url },
            });
            urls[file.id] = res.data.url;
          } catch (err) {
            console.error(
              "Erro ao buscar signed URL para o anexo:",
              file.fileName,
              err
            );
            urls[file.id] = "#"; // Define um link que não leva a lugar nenhum em caso de erro
          }
        })
      );

      setSignedUrls(urls);
      setLoadingSignedUrls(false);
    };

    if (isOpen) {
      fetchSignedUrls();
    }
  }, [item, isOpen]);
  if (!item) return null;
  const { type, data } = item;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            Aprovado
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1.5" />
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[#f5b719] hover:bg-[#f5b719]/90">
            <Clock className="h-3 w-3 mr-1.5" />
            Pendente
          </Badge>
        );
    }
  };
  const renderContent = () => {
    switch (type) {
      case "tag":
        const template = data.template; // Assuming the full template is passed in the data
        let streakCount = 0;
        if (
          template &&
          template.isScalable &&
          template.escalationValue &&
          template.escalationValue !== 0
        ) {
          const bonusPoints = data.value - template.baseValue;
          streakCount = Math.round(bonusPoints / template.escalationValue);
        }
        return (
          <>
            <ModalHeader
              icon={<Tag className="h-6 w-6 text-white" />}
              title="Detalhes da Tag"
            />
            <div className="p-6">
              <dl>
                <DetailRow
                  icon={<PencilLine size={16} />}
                  label="Título"
                  value={template.name ?? "-"}
                />
                <DetailRow
                  icon={<PencilLine size={16} />}
                  label="Descrição"
                  value={data.description}
                />
                <DetailRow
                  icon={<Star size={16} />}
                  label="Pontos"
                  value={
                    <span className="font-bold text-2xl text-[#f5b719]">
                      {data.value}
                    </span>
                  }
                />
                {template?.isScalable && (
                  <DetailRow
                    icon={<TrendingUp size={16} />}
                    label="Nível de Streak"
                    value={
                      <span className="font-bold text-xl text-green-400 flex items-center">
                        {streakCount > 0 ? `+${streakCount}` : streakCount}
                        <span className="text-xs text-gray-400 ml-2">
                          (Bônus: {data.value - template.baseValue} pts)
                        </span>
                      </span>
                    }
                  />
                )}
                <DetailRow
                  icon={<ClipboardList size={16} />}
                  label="Tipo"
                  value={data.actionType?.name}
                />

                <DetailRow
                  icon={<Calendar size={16} />}
                  label="Data da Ação"
                  value={format(new Date(data.datePerformed), "dd/MM/yyyy")}
                />
                <DetailRow
                  icon={<Building size={16} />}
                  label="É para a empresa?"
                  value={data.isForEnterprise ? "Sim" : 'Não'}
                />
                <DetailRow
                  icon={<User size={16} />}
                  label="Atribuído por"
                  value={data.assigner?.name || "Sistema"}
                />
                <DetailRow
                  icon={<BookOpen size={16} />}
                  label="Versão das Regras"
                  value={data.jrPointsVersion?.versionName}
                />
              </dl>
            </div>
          </>
        );
      case "solicitation":
        return (
          <>
            <ModalHeader
              icon={<FileText className="h-6 w-6 text-white" />}
              title="Detalhes da Solicitação"
            />
            <div className="p-6">
              <dl>
                <DetailRow
                  icon={<Hash size={16} />}
                  label="Status"
                  value={getStatusBadge(data.status)}
                />
                <DetailRow
                  icon={<PencilLine size={16} />}
                  label="Descrição"
                  value={
                    <p className="whitespace-pre-wrap">
                      {data.description ?? ""}
                    </p>
                  }
                />
                <DetailRow
                  icon={<Calendar size={16} />}
                  label="Data da Ação"
                  value={
                    format(new Date(data.datePerformed), "dd/MM/yyyy") ?? ""
                  }
                />
                <DetailRow
                  icon={<Building size={16} />}
                  label="É para a empresa?"
                  value={data.isForEnterprise ? "Sim" : 'Não'}
                />
                <DetailRow
                  label="Tags Solicitadas"
                  icon={<Tag size={16} />}
                  value={
                    <div className="flex flex-wrap gap-2">
                      {data.tags.map((t: any) => (
                        <Badge key={t.id} className="bg-[#0126fb]">
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                  }
                />
                <DetailRow
                  label="Membros Envolvidos"
                  icon={<Users size={16} />}
                  value={
                    <div className="flex flex-wrap gap-2">
                      {data.membersSelected.map((m: any) => (
                        <Badge className="bg-[#0126fb]" key={m.id}>
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  }
                />
                <DetailRow
                  icon={<MessageSquare size={16} />}
                  label="Nota da Diretoria"
                  value={data.directorsNotes ?? ""}
                />
                <DetailRow
                  icon={<CircleUser size={16} />}
                  label="Auditor(a)"
                  value={data.reviewer?.name ?? "Diretoria"}
                />
              </dl>
            </div>
          </>
        );
      case "report":
        return (
          <>
            <ModalHeader
              icon={<Flag className="h-6 w-6 text-white" />}
              title="Detalhes do Recurso"
            />
            <div className="p-6">
              <dl>
                <DetailRow
                  icon={<Hash size={16} />}
                  label="Status"
                  value={getStatusBadge(data.status)}
                />
                <DetailRow
                  icon={<PencilLine size={16} />}
                  label="Descrição do Recurso"
                  value={
                    <p className="whitespace-pre-wrap">
                      {data.description ?? ""}
                    </p>
                  }
                />
                <DetailRow
                  icon={<Tag size={16} />}
                  label="Tag Contestada"
                  value={data.tag.name ?? ""}
                />
                <DetailRow
                  icon={<Star size={16} />}
                  label="Valor Original"
                  value={`${data.tag.value || 0} pts`}
                />
                <DetailRow
                  icon={<MessageSquare size={16} />}
                  label="Nota da Diretoria"
                  value={data.directorsNotes ?? ""}
                />
                <DetailRow
                  icon={<CircleUser size={16} />}
                  label="Auditor(a)"
                  value={data.reviewer?.name ?? "Diretoria"}
                />
              </dl>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]" />
        <DialogContent className="w-full max-h-[90vh]  max-w-2xl bg-[#010d26] border-2 border-[#0126fb]/50 text-white z-[70] p-0 rounded-lg overflow-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {renderContent()}
          {item.data.attachments && item.data.attachments.length > 0 && (
            <div className="px-6 pb-6 pt-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Anexos
              </h4>
              <div className="space-y-2">
                {loadingSignedUrls ? (
                  <p className="text-sm text-gray-500">Carregando links...</p>
                ) : (
                  item.data.attachments.map((file: any) => (
                    <a
                      href={signedUrls[file.id] || "#"} // Usa a URL do estado
                      target="_blank"
                      rel="noopener noreferrer"
                      key={file.id}
                      className="flex items-center gap-2 text-sm text-blue-400 hover:underline p-2 rounded-md bg-[#00205e]/50 hover:bg-[#00205e]"
                    >
                      <Paperclip className="h-4 w-4" />
                      {file.fileName}
                    </a>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default HistoryItemDetailsModal;
