// src/components/RequestReviewModal.tsx (versão final e simplificada)

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Ban,
  Building,
  Check,
  Loader2,
  Paperclip,
  Pencil,
  Sparkles,
  User,
} from "lucide-react";
import CustomTextArea from "../../Global/Custom/CustomTextArea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import {
  FullJRPointsReport,
  FullJRPointsSolicitation,
} from "./SolicitationsBoard";
import { Form } from "@/components/ui/form";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import CustomInput from "../../Global/Custom/CustomInput";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

// ... (interfaces e tipos não mudam) ...
export interface ReviewData {
  id: string;
  type: "solicitation" | "report";
  status: "APPROVED" | "REJECTED";
  directorsNotes: string;
  newValue?: number;
  newDescription?: string;
}

type ReviewRequest =
  | (FullJRPointsReport & { type: "report" })
  | (FullJRPointsSolicitation & { type: "solicitation" });

interface RequestReviewModalProps {
  request: ReviewRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onReview: (data: ReviewData) => void;
  isReviewing: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const reviewFormSchema = z.object({
  directorsNotes: z
    .string()
    .min(10, { message: "A justificativa deve ter no mínimo 10 caracteres." }),
  newDescription: z.string().optional(),
  newValue: z.coerce.number().optional(), // coerce tenta converter string vazia para número (NaN) que tratamos
});
export type ReviewFormData = z.infer<typeof reviewFormSchema>;
const RequestReviewModal = ({
  request,
  isOpen,
  onClose,
  onReview,
  isReviewing,
}: RequestReviewModalProps) => {
  const [streakValues, setStreakValues] = useState<Record<string, number>>({});
  const [isLoadingStreaks, setIsLoadingStreaks] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingSignedUrls, setLoadingSignedUrls] = useState(false);
  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema), // Conecta o Zod ao react-hook-form
    defaultValues: {
      directorsNotes: "",
      newDescription: "",
      newValue: undefined,
    },
  });

  useEffect(() => {
    const fetchStreakValues = async () => {
      if (!request || request.type !== "solicitation" || !request.tags.length) {
        setStreakValues({});
        return;
      }

      setIsLoadingStreaks(true);

      const members = request.isForEnterprise
        ? []
        : [...request.membersSelected];
      const uniqueUserIds = Array.from(new Set(members.map((m) => m.id)));

      // Se for para a empresa, não há usuários para calcular streak individual
      if (request.isForEnterprise) {
        setIsLoadingStreaks(false);
        return;
      }

      const calculationRequests = uniqueUserIds.flatMap((userId) =>
        request.tags.map((tag) => ({
          userId,
          tagTemplateId: tag.id,
        }))
      );

      try {
        const { data } = await axios.post(
          `${API_URL}/api/jr-points/calculate-streaks`,
          {
            requests: calculationRequests,
            datePerformed: new Date(request.datePerformed).toISOString(),
          }
        );
        setStreakValues(data);
      } catch (error) {
        console.error("Erro ao calcular valores de streak:", error);
      } finally {
        setIsLoadingStreaks(false);
      }
    };

    if (isOpen) {
      fetchStreakValues();
    }
  }, [request, isOpen]);

  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (!request || !request.attachments?.length) return;

      setLoadingSignedUrls(true);
      const urls: Record<string, string> = {};

      await Promise.all(
        request.attachments.map(async (file) => {
          try {
            const res = await axios.get(`/api/s3-get-signed-url`, {
              params: { key: file.url },
            });
            urls[file.id] = res.data.url;
          } catch (err) {
            console.error("Erro ao buscar signed URL", err);
          }
        })
      );

      setSignedUrls(urls);
      setLoadingSignedUrls(false);
    };

    if (isOpen) {
      fetchSignedUrls();
    }
  }, [request, isOpen]);

  useEffect(() => {
    if (request) {
      // Reseta o formulário com os valores corretos ao abrir o modal
      const notes = "directorsNotes" in request ? request.directorsNotes : "";
      if (request.type === "report") {
        form.reset({
          directorsNotes: notes || "",
          newDescription: request.tag.description,
          newValue: request.tag.value,
        });
      } else {
        form.reset({
          directorsNotes: notes || "",
          newDescription: "",
          newValue: undefined,
        });
      }
    }
  }, [request, form, isOpen]); // Roda o efeito também quando 'isOpen' muda
  if (!request) return null;

  const handleSubmit =
    (status: "APPROVED" | "REJECTED") => (values: ReviewFormData) => {
      onReview({
        id: request.id,
        type: request.type,
        status,
        directorsNotes: values.directorsNotes,
        newValue: request.type === "report" ? values.newValue : undefined,
        newDescription:
          request.type === "report" ? values.newDescription : undefined,
      });
    };

  const isSolicitation = (
    req: ReviewRequest
  ): req is FullJRPointsSolicitation & { type: "solicitation" } =>
    req.type === "solicitation";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="bg-[#010d26] text-white border-2 border-[#0126fb] w-[80vw] max-w-[80vw] sm:max-w-[80vw] 
    max-h-[90vh]"
      >
        <Form {...form}>
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-gray-700">
                <AvatarImage src={request.user.imageUrl} />
                <AvatarFallback>
                  {request.user.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">
                  Revisar {isSolicitation(request) ? "Solicitação" : "Recurso"}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-4 text-gray-400">
                  <span>De: {request.user.name}</span>
                  <Badge
                    variant={request.isForEnterprise ? "default" : "secondary"}
                    className={
                      request.isForEnterprise
                        ? "bg-[#00205e]"
                        : "bg-[#0126fb] text-white"
                    }
                  >
                    {request.isForEnterprise ? (
                      <Building className="h-3 w-3 mr-1.5" />
                    ) : (
                      <User className="h-3 w-3 mr-1.5" />
                    )}
                    Alvo: {request.isForEnterprise ? "Empresa" : "Membros"}
                  </Badge>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 my-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#0126fb]">
            {/* Detalhes do Pedido */}
            <div className="p-4 bg-[#00205e]/30 rounded-lg border border-gray-700">
              <h4 className="font-semibold mb-2 text-[#f5b719]">
                Descrição do Pedido
              </h4>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {request.description}
              </p>
            </div>

            {/* --- 3. SEÇÃO CONDICIONAL PARA EDIÇÃO DO RECURSO --- */}
            {!isSolicitation(request) && (
              <div className="p-4 bg-[#00205e]/30 rounded-lg border border-dashed border-[#f5b719]/50 space-y-4">
                <h4 className="font-semibold text-[#f5b719] flex items-center">
                  <Pencil className="h-4 w-4 mr-2" />
                  Ação de Correção (Opcional)
                </h4>
                <p className="text-xs text-gray-400">
                  Ao aprovar este recurso, você pode editar os detalhes da tag
                  original. Deixe os campos como estão para manter os valores
                  originais.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CustomInput
                    form={form}
                    field="newValue"
                    label="Novo Valor (Pontos)"
                    type="number"
                    disabled={request.status !== "PENDING"}
                  />
                  <div className="sm:col-span-2">
                    <CustomInput
                      form={form}
                      field="newDescription"
                      label="Nova Descrição da Tag"
                      disabled={request.status !== "PENDING"}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contexto Específico (Solicitação vs Recurso) */}
            {isSolicitation(request) ? (
              <div className="p-4 bg-[#00205e]/30 rounded-lg border border-gray-700 space-y-4">
                <h4 className="font-semibold text-[#f5b719]">
                  Contexto da Solicitação
                </h4>
                <p className="text-sm">
                  <strong>Data da Realização:</strong>{" "}
                  {format(request.datePerformed, "dd/MM/yyyy")}
                </p>
                {request.tags.length > 0 && (
                  <div>
                    <p className="font-medium text-sm mb-2">
                      Tags Solicitadas:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {request.tags.map((t) => (
                        <Badge
                          key={t.id + "-tag"}
                          variant="outline"
                          className="bg-[#0126fb]/80 border-[#0126fb] text-white "
                        >
                          {t.name} | {t.baseValue} pts
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {!request.isForEnterprise &&
                  request.membersSelected.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2 mt-4">
                        Membros Envolvidos e Pontuação Prevista:
                      </p>
                      <div className="space-y-2">
                        {isLoadingStreaks ? (
                          <div className="flex items-center text-xs text-gray-400">
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />{" "}
                            Calculando bônus de streak...
                          </div>
                        ) : (
                          request.membersSelected
                            .filter(
                              (value, index, self) =>
                                self.findIndex((v) => v.id === value.id) ===
                                index
                            ) // Garante usuários únicos
                            .map((m) => (
                              <div key={m.id + "-streak"} className="text-sm">
                                <span className="font-semibold">{m.name}:</span>
                                <div className="flex flex-wrap gap-2 pl-4 pt-1">
                                  {request.tags.map((t) => {
                                    const key = `${m.id}-${t.id}`;
                                    const finalValue =
                                      streakValues[key] ?? t.baseValue;
                                    const bonus = finalValue - t.baseValue;
                                    return (
                                      <Badge
                                        key={key}
                                        className="bg-gray-700 font-normal"
                                      >
                                        {t.name}: {finalValue} pts
                                        {bonus !== 0 && (
                                          <span
                                            className={`ml-1.5 flex items-center ${bonus > 0 ? "text-green-400" : "text-red-400"}`}
                                          >
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            ({bonus > 0 ? `+${bonus}` : bonus})
                                          </span>
                                        )}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="p-4 bg-[#00205e]/30 rounded-lg border border-gray-700">
                <h4 className="font-semibold text-[#f5b719]">
                  Contexto do Recurso
                </h4>
                <div className="mt-2 text-sm space-y-2 border-l-2 border-gray-600 pl-3">
                  <p>
                    <strong>Tag Contestada:</strong> {request.tag.description}
                  </p>
                  <p>
                    <strong>Valor Original:</strong> {request.tag.value} pontos
                  </p>
                  <p>
                    <strong>Atribuído por:</strong>{" "}
                    {request.tag.assigner?.name || "Sistema"}
                  </p>
                </div>
              </div>
            )}

            {request.attachments && request.attachments.length > 0 && (
              <div className="p-4 bg-[#00205e]/30 rounded-lg border border-gray-700">
                <h4 className="font-semibold mb-2 text-[#f5b719]">Anexos</h4>
                <div className="space-y-2">
                  {request.attachments.map((file) => (
                    <div key={file.id + -"div"}>
                      <a
                        href={signedUrls[file.id] || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={file.id}
                        className="flex items-center gap-2 text-sm text-blue-400 hover:underline"
                      >
                        <Paperclip className="h-4 w-4" />
                        {file.fileName}
                      </a>
                      {loadingSignedUrls && (
                        <p className="text-xs text-gray-400">
                          Carregando URLs...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <CustomTextArea
              form={form}
              field="directorsNotes"
              label="Justificativa da Decisão (Obrigatório)"
              placeholder="Adicione uma nota para o membro..."
              disabled={request.status !== "PENDING"}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={form.handleSubmit(handleSubmit("REJECTED"))}
              disabled={isReviewing || request.status !== "PENDING"}
            >
              <Loader2
                className={`animate-spin mr-2 ${!isReviewing && "hidden"}`}
              />
              <Ban className={`mr-2 h-4 w-4 ${isReviewing && "hidden"}`} />{" "}
              Rejeitar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={form.handleSubmit(handleSubmit("APPROVED"))}
              disabled={isReviewing || request.status !== "PENDING"}
            >
              <Loader2
                className={`animate-spin mr-2 ${!isReviewing && "hidden"}`}
              />
              <Check className={`mr-2 h-4 w-4 ${isReviewing && "hidden"}`} />{" "}
              Aprovar
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestReviewModal;
