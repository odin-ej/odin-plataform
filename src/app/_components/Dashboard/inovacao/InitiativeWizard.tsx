/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Save,
  Trash2,
  Calendar,
  LinkIcon,
  Plus,
  AlertCircle,
  XCircle,
  CheckCircle,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn, handleFileAccepted } from "@/lib/utils";
import {
  AreaInovationInitiative,
  InovationHorizonTypes,
  SubAreaInovationInitiative,
} from "@prisma/client";
import DynamicDropzone from "../../Global/Custom/DynamicDropzone";
import CustomInput from "../../Global/Custom/CustomInput";
import CustomTextArea from "../../Global/Custom/CustomTextArea";
import CustomSelect from "../../Global/Custom/CustomSelect";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createInovationInitiativeSchema,
  CreateInovationValues,
} from "@/lib/schemas/inovation";
import {
  getAllOptionsForWizard,
  createInovationInitiative,
  updateInovationInitiative,
  auditInovationInitiative,
} from "@/lib/actions/inovation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CommandMultiSelect from "../../Global/Custom/CommandMultiSelect";
import ImageCropModal from "../../Global/ImageCropModal";
import RelatedInitiativeSelect from "./RelatedInitiativeSelect";
import { FullInovationInitiative } from "./InovationCard";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InitiativeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  dataToEdit?: FullInovationInitiative | null;
  isAuditMode?: boolean;
}

const STEPS = [
  { id: 1, title: "O Básico", description: "Identificação da iniciativa" },
  { id: 2, title: "Detalhes", description: "Áreas e Links" },
  { id: 3, title: "Método S.O.C.I.O", description: "Alinhamento estratégico" },
];

const SOCIO = [
  { key: "S", name:'sentido', label: "Sentido", description: "Por que estamos fazendo isso?" },
  {
    key: "O",
    name: 'organizacao',
    label: "Organização",
    description: "Como estamos hoje e o que queremos mudar?",
  },
  {
    key: "C",
    name: 'cultura',
    label: "Cultura",
    description: "Como isso vai virar hábito e não só uma iniciativa pontual?",
  },
  {
    key: "I",
    name: 'influencia',
    label: "Influência",
    description: "Quem vai puxar e mobilizar para isso acontecer?",
  },
  {
    key: "O",
    name: 'operacao',
    label: "Operação",
    description: "Como faremos isso rodar bem e como vamos medir?",
  },
];

export const InitiativeWizard = ({
  isOpen,
  onClose,
  dataToEdit,
  isAuditMode = false,
}: InitiativeWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const queryClient = useQueryClient();
  console.log(dataToEdit)
  // Adiciona o passo de auditoria se estiver no modo auditoria
  const activeSteps = isAuditMode
    ? [
        ...STEPS,
        { id: 4, title: "Auditoria", description: "Revisão e Aprovação" },
      ]
    : STEPS;

  const { data } = useQuery({
    queryKey: ["inovationInitiativesWizard"],
    queryFn: getAllOptionsForWizard,
  });

  // --- ACTIONS (Mutations) ---
  const createMutation = useMutation({
    mutationFn: createInovationInitiative,
    onSuccess: () => {
      toast.success("Iniciativa criada com sucesso!");
      handleClose();
    },
    onError: () => toast.error("Erro ao criar iniciativa."),
  });

  const updateMutation = useMutation({
    mutationFn: updateInovationInitiative,
    onSuccess: () => {
      toast.success("Iniciativa atualizada com sucesso!");
      handleClose();
    },
    onError: () => toast.error("Erro ao atualizar iniciativa."),
  });

  const auditMutation = useMutation({
    mutationFn: auditInovationInitiative,
    onSuccess: () => {
      toast.success("Auditoria realizada com sucesso!");
      handleClose();
    },
    onError: () => toast.error("Erro ao auditar iniciativa."),
  });

  // Inicializando o Form
  const form = useForm<CreateInovationValues>({
    resolver: zodResolver(createInovationInitiativeSchema),
    defaultValues: {
      title: "",
      type: "Iniciativa",
      shortDescription: "",
      semesterId: "",
      isRunning: "false",
      description: "",
      areas: [],
      subAreas: [],
      members: [],
      links: [{ label: "", url: "" }],
      tags: "",
      sentido: "",
      organizacao: "",
      cultura: "",
      influencia: "",
      operacao: "",
      imageUrl: "",
      reviewNotes: "", // Campo para auditoria
    },
  });

  const hasInitialized = useRef(false);
  const prevOpenState = useRef(isOpen);

  // Resetar formulário ao abrir para edição/auditoria
  useEffect(() => {
    if (isOpen && !prevOpenState.current) {
      hasInitialized.current = false; // Permite inicializar
    }
    prevOpenState.current = isOpen;
    if (isOpen && !hasInitialized.current) {

      if (dataToEdit) {

        const relatedId = 
    dataToEdit.relatedTo && dataToEdit.relatedTo.length > 0
      ? dataToEdit.relatedTo[0].toId // ou .to.id dependendo do seu tipo gerado
      : undefined;

        // Preenche o formulário com dados existentes
        form.reset({
          title: dataToEdit.title,
          type: dataToEdit.type as any,
          shortDescription: dataToEdit.shortDescription,
          semesterId: dataToEdit.semesterId,
          isRunning: String(dataToEdit.isRunning),
          dateImplemented: dataToEdit.dateImplemented || undefined,
          dateColected: dataToEdit.dateColected|| undefined,
          dateChecked: dataToEdit.dateChecked || undefined,
          relatedToId: relatedId, // use relatedTo.id if available
          description: dataToEdit.description,
          areas: dataToEdit.areas,
          subAreas: dataToEdit.subAreas,
          members: dataToEdit.members.map((m) => m.id), // Supondo relation
          links:
            dataToEdit.links.length > 0
              ? dataToEdit.links
              : [],
          tags: dataToEdit.tags.join(", "),
          sentido: dataToEdit.sentido || "",
          organizacao: dataToEdit.organizacao || "",
          cultura: dataToEdit.cultura || "",
          influencia: dataToEdit.influencia || "",
          operacao: dataToEdit.operacao || "",
          imageUrl: dataToEdit.imageUrl || "", // Assumindo URL
          reviewNotes: dataToEdit.reviewNotes || "",
        });
      } else {
        form.reset({
          title: "",
          type: "Iniciativa",
          shortDescription: "",
          semesterId: data?.semesters[0]?.id || "",
          isRunning: "false",
          description: "",
          areas: [],
          subAreas: [],
          members: [],
          links: [],
          tags: "",
          imageUrl: "",
        });
      }
      hasInitialized.current = true;
      setCurrentStep(1);
    }
  }, [isOpen, dataToEdit, data, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "links",
  });

  const isDisabled = useMemo(() => {
    return (
      createMutation.isPending ||
      updateMutation.isPending ||
      auditMutation.isPending
    );
  }, [
    auditMutation.isPending,
    createMutation.isPending,
    updateMutation.isPending,
  ]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      form.reset();
      setCurrentStep(1);
    }, 300);
    queryClient.invalidateQueries({ queryKey: ["inovation-initiatives"] });
  };

const onFormSubmit = (values: CreateInovationValues) => {
    if (isAuditMode && dataToEdit) {
      // AUDITORIA
      auditMutation.mutate({
        id: dataToEdit.id,
        status: dataToEdit.isRunning ? "RUNNING" : "APPROVED",
        reviewNotes: values.reviewNotes || "",
      });
    } else if (dataToEdit) {
      // EDIÇÃO OU REENVIO
      const status =
        dataToEdit.status === "REJECTED" ? "PENDING" : dataToEdit.status;
      updateMutation.mutate({ id: dataToEdit.id, data: { ...values, status } });
    } else {
      // CRIAÇÃO
      createMutation.mutate(values);
    }
  };

  // Esta função captura os erros de validação e avisa o usuário
  const onFormError = (errors: any) => {
    console.error("Erros de validação:", errors);
    toast.error(`Existem erros: verifique os campos do formulário.}`);
  };

  const handleReject = () => {
    if (!isAuditMode || !dataToEdit) return;
    const notes = form.getValues("reviewNotes");
    if (!notes) {
      form.setError("reviewNotes", {
        message: "Justificativa obrigatória para rejeição.",
      });
      return;
    }
    auditMutation.mutate({
      id: dataToEdit.id,
      status: "REJECTED",
      reviewNotes: notes,
    });
  };

  const nextStep = () =>
    setCurrentStep((prev) => Math.min(prev + 1, activeSteps.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  // Options
  const areaOptions = Object.values(AreaInovationInitiative).map((area) => ({
    value: area,
    label: area,
  }));
  const subAreaOptions = Object.values(SubAreaInovationInitiative).map(
    (subArea) => ({ value: subArea, label: subArea })
  );

  const horizonOptions = Object.values(InovationHorizonTypes).map(
    (horizon) => ({
      value: horizon,
      label: horizon,
    })
  );

  const inovationInitiativeOptions = data?.inovationInitiatives ?? [];
  const memberOptions = data?.users.filter((u) => u.id !== process.env.ADMIN_ID) ?? [];
  const semesterOptions =
    data?.semesters.map((semester) => ({
      label: semester.name,
      value: semester.id,
    })) ?? [];

  // --- Image Handlers ---
  const handleFileSelect = (file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    // Cria o arquivo real a partir do blob do corte
    const croppedFile = new File([croppedImageBlob], "cover_image.jpeg", {
      type: "image/jpeg",
    });

    form.setValue("imageUrl", croppedFile, {
      shouldDirty: true,
      shouldValidate: true,
    });

    // Forçamos o progresso para 100 visualmente (opcional, já que é local)
    setUploadProgress(100);

    setImageToCrop(null);
  };

  const isRejected = dataToEdit?.status === "REJECTED" && !isAuditMode;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          onInteractOutside={(e) => imageToCrop && e.preventDefault()}
          className="!max-w-none w-[90%] 2xl:w-auto bg-[#010d26] border-blue-900/50 text-white p-0 gap-0 overflow-hidden md:min-h-[650px] max-h-[90%] overflow-y-auto scrollbar-thin scrollbar-track-transparent flex flex-col"
        >
          {/* Header */}
          <div className="bg-[#0b1629] p-6 border-b border-blue-900/30 flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Lightbulb className="text-amber-400" />
                {isAuditMode
                  ? "Auditoria de Iniciativa"
                  : dataToEdit
                  ? "Editar Iniciativa"
                  : "Nova Iniciativa"}
              </DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                {isAuditMode
                  ? "Revise os dados e defina o status."
                  : "Preencha as informações para o banco de inovação."}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {isAuditMode && (
                <Badge
                variant="outline"
                className={"border-purple-400 text-purple-400"}
              >
                Modo Auditor
              </Badge>
              )}
              <Badge
                variant="outline"
                className={"border-amber-400 text-amber-400"}
              >
                {(() => {
                  if (!dataToEdit) return "Rascunho";
                  switch (dataToEdit.status) {
                    case "PENDING":
                      return "Pendente";
                    case "APPROVED":
                      return "Aprovado";
                    case "RUNNING":
                      return "Rodando";
                    case "REJECTED":
                      return "Rejeitado";
                    default:
                      return "Rascunho";
                  }
                })()}
              </Badge>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-[#020817] p-6 border-r border-blue-900/30 hidden md:block">
              <div className="space-y-8 relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-slate-800 -z-10" />
                {activeSteps.map((step) => {
                  const isActive = step.id === currentStep;
                  const isCompleted = step.id < currentStep;
                  return (
                    <div
                      key={step.id}
                      className="flex gap-4 items-start relative z-10"
                    >
                      <div
                        className={`
                        w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300
                        ${
                          isActive
                            ? "bg-amber-400 border-amber-400 text-black scale-110"
                            : isCompleted
                            ? "bg-green-500 border-green-500 text-black"
                            : "bg-[#020817] border-slate-600 text-slate-600"
                        }
                      `}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <span className="text-xs font-bold">{step.id}</span>
                        )}
                      </div>
                      <div className="mt-0.5">
                        <h4
                          className={`text-sm font-bold ${
                            isActive ? "text-white" : "text-slate-500"
                          }`}
                        >
                          {step.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-tight mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Area */}
            <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-[#010d26] to-[#000510] scrollbar-thin scrollbar-track-transparent">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onFormSubmit, onFormError)} className="space-y-6">
                  {/* ALERTA DE REJEIÇÃO (Se for edição de item rejeitado) */}
                  {isRejected && currentStep === 1 && (
                    <Alert
                      variant="destructive"
                      className="bg-red-900/20 border-red-900 text-red-200 mb-6"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Iniciativa Rejeitada</AlertTitle>
                      <AlertDescription>
                        Motivo: {dataToEdit.reviewNotes} <br />
                        Faça os ajustes necessários e reenvie para aprovação.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* --- ETAPA 1: O Básico --- */}
                  {currentStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <DynamicDropzone
                        control={form.control}
                        name={"imageUrl"} // O form pode ter string (URL do banco) ou File (Upload novo)
                        label={"Imagem (Opcional)"}
                        // Intercepta o drop para abrir o modal de corte
                        onFileSelect={handleFileSelect}
                        progress={uploadProgress}
                        onFileAccepted={() =>
                          handleFileAccepted(setUploadProgress)
                        }
                        page="inovation"
                        disabled={isAuditMode}
                        defaultImageUrl={
                          typeof form.watch("imageUrl") === "string"
                            ? (form.watch("imageUrl") as string)
                            : undefined
                        }
                      />

                      <div
                        className={cn(
                          "grid grid-cols-2 gap-4",
                          isAuditMode && "grid-cols-3"
                        )}
                      >
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título</FormLabel>
                              <Input
                                {...field}
                                disabled={isAuditMode}
                                className="bg-[#020817] border-blue-900/30 text-white"
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={isAuditMode}
                              >
                                <SelectTrigger className="bg-[#020817] border-blue-900/30 text-white">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0b1629] border-blue-900/30 text-white">
                                  {[
                                    "Iniciativa",
                                    "Evento",
                                    "Pilula",
                                    "Nucleo",
                                  ].map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        {isAuditMode && (
                          <CustomSelect
                            control={form.control}
                            name="isRunning"
                            label="Status"
                            placeholder="Selecione..."
                            options={[
                              { label: "Não Iniciada", value: "false" },
                              { label: "Rodando", value: "true" },
                            ]}
                          />
                        )}
                      </div>

                      <FormField
                        control={form.control}
                        name="shortDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição Curta</FormLabel>
                            <Textarea
                              {...field}
                              disabled={isAuditMode}
                              className="bg-[#020817] border-blue-900/30 text-white h-20 resize-none"
                              maxLength={140}
                              placeholder="Descrição de até 140 caracteres."
                            />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-900/10 rounded-xl border border-blue-900/20">
                        <DateField
                          control={form.control}
                          name="dateImplemented"
                          label="Data Implementação"
                          disabled={isAuditMode}
                        />
                        <DateField
                          control={form.control}
                          name="dateColected"
                          label="Data Coleta"
                          disabled={isAuditMode}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomSelect
                          placeholder="Selecione..."
                          control={form.control}
                          name="semesterId"
                          label="Semestre"
                          options={semesterOptions}
                          disabled={isAuditMode}
                        />
                        <FormField
                          control={form.control}
                          name="relatedToId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Relacionado à</FormLabel>
                              <RelatedInitiativeSelect
                                value={field.value as string}
                                onChange={field.onChange}
                                options={
                                  inovationInitiativeOptions as FullInovationInitiative[]
                                }
                                disabled={isAuditMode} // Prop customizada no seu componente
                              />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* --- ETAPA 2: Detalhes --- */}
                  {currentStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <CustomTextArea
                        control={form.control}
                        field="description"
                        label="Descrição Completa"
                        disabled={isAuditMode}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CommandMultiSelect
                          form={form}
                          name="areas"
                          label="Áreas"
                          options={areaOptions}
                          disabled={isAuditMode}
                        />
                        <CommandMultiSelect
                          form={form}
                          name="subAreas"
                          label="Subáreas"
                          options={subAreaOptions}
                          disabled={isAuditMode}
                        />
                      </div>
                      <CommandMultiSelect
                        form={form}
                        name="members"
                        label="Membros"
                        options={memberOptions}
                        disabled={isAuditMode}
                      />

                      {/* Links */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <FormLabel className="flex items-center gap-2">
                            <LinkIcon size={14} className="text-amber-400" />{" "}
                            Links e Anexos
                          </FormLabel>
                          {!isAuditMode && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => append({ label: "", url: "" })}
                              className="text-xs text-amber-400"
                            >
                              <Plus size={12} className="mr-1" /> Adicionar Link
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3 max-h-[200px] overflow-y-auto">
                          {fields.map((field, index) => (
                            <div
                              key={field.id}
                              className="flex gap-3 items-start"
                            >
                              <FormField
                                control={form.control}
                                name={`links.${index}.label`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0 flex-1">
                                    <Input
                                      {...field}
                                      disabled={isAuditMode}
                                      placeholder="Título"
                                      className="bg-[#020817] border-blue-900/30 text-white text-xs h-9"
                                    />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`links.${index}.url`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0 flex-[2]">
                                    <Input
                                      {...field}
                                      disabled={isAuditMode}
                                      placeholder="URL"
                                      className="bg-[#020817] border-blue-900/30 text-white text-xs h-9"
                                    />
                                  </FormItem>
                                )}
                              />
                              {!isAuditMode && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                  className="h-9 w-9 text-slate-500 hover:text-red-400"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      {isAuditMode && (
                        <CustomSelect
                          control={form.control}
                          label={"Horizonte de Inovação"}
                          placeholder="Selecione..."
                          name="inovationHorizon"
                          options={horizonOptions}
                        />
                      )}
                      <CustomInput
                        form={form}
                        field="tags"
                        label="Tags"
                        placeholder="Separe por vírgulas. Ex.: Inovação, Núcleo, DS"
                        disabled={isAuditMode}
                      />
                    </div>
                  )}

                  {/* --- ETAPA 3: S.O.C.I.O --- */}
                  {currentStep === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="bg-blue-900/20 border border-blue-900/40 p-4 rounded-lg mb-4">
                        <h4 className="text-amber-400 font-bold mb-1">
                          Método S.O.C.I.O
                        </h4>
                        <p className="text-xs text-slate-300">
                          Alinhamento estratégico.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 max-h-[350px] overflow-y-auto">
                        {SOCIO.map(({ key, label, name, description }) => (
                          <FormField
                            key={label}
                            control={form.control}
                            name={name as any}
                            render={({ field }) => (
                              <SocioInput
                                letter={key}
                                label={label}
                                description={description}
                                field={field}
                                disabled={isAuditMode}
                              />
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* --- ETAPA 4: Auditoria (Apenas Audit Mode) --- */}
                  {currentStep === 4 && isAuditMode && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="bg-purple-900/20 border border-purple-900/50 p-6 rounded-xl text-center">
                        <CheckCircle
                          size={48}
                          className="mx-auto text-purple-400 mb-4"
                        />
                        <h3 className="text-xl font-bold text-white">
                          Revisão Final
                        </h3>
                        <p className="text-slate-400 text-sm mt-2">
                          Como auditor, deixe suas considerações abaixo para
                          aprovar ou rejeitar esta iniciativa.
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="reviewNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-purple-400 font-bold">
                              Notas da Auditoria (Obrigatório)
                            </FormLabel>
                            <Textarea
                              {...field}
                              placeholder="Descreva o que falta ou confirme a aprovação..."
                              className="min-h-[150px] bg-[#020817] border-purple-500/30 text-white focus-visible:ring-purple-500"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </form>
              </Form>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="bg-[#0b1629] p-4 border-t border-blue-900/30 flex justify-between items-center w-full">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="text-slate-400 hover:text-white bg-transparent hover:bg-transparent"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>

            <div className="flex gap-2">
              {/* Botão de Rejeição apenas na etapa de Auditoria */}
              {currentStep === 4 && isAuditMode && (
                <Button
                  onClick={handleReject}
                  disabled={
                    dataToEdit?.status === "REJECTED" || auditMutation.isPending
                  }
                  variant="destructive"
                  className="bg-red-900/50 hover:bg-red-900 border border-red-800"
                >
                  <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                </Button>
              )}

              {currentStep < activeSteps.length ? (
                <Button
                  onClick={nextStep}
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={form.handleSubmit(onFormSubmit, onFormError)}
                  disabled={isDisabled}
                  type="button"
                  className={
                    isAuditMode
                      ? "bg-purple-500 hover:bg-purple-600 text-white font-bold"
                      : "bg-amber-400 hover:bg-amber-500 text-black font-bold"
                  }
                >
                  {isAuditMode ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" /> Aprovar
                    </>
                  ) : isRejected ? (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Reenviar
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Salvar
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crop Modal */}
      {imageToCrop && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <ImageCropModal
            imageSrc={imageToCrop}
            onClose={() => setImageToCrop(null)}
            onCropComplete={handleCropComplete}
            cropShape={"rect"}
            aspect={16 / 9}
          />
        </div>
      )}
    </>
  );
};

// --- SUB-COMPONENTES ---

const DateField = ({ control, name, label, disabled }: any) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => {
      const value =
        field.value instanceof Date
          ? field.value.toISOString().slice(0, 10)
          : field.value
          ? String(field.value)
          : "";
      return (
        <FormItem>
          <FormLabel className="text-xs text-slate-400">{label}</FormLabel>
          <div className="relative">
            <Input
              type="date"
              disabled={disabled}
              value={value}
              onChange={(e) => field.onChange(e.target.value)}
              className="bg-[#020817] border-blue-900/30 text-white text-xs pl-8"
            />
            <Calendar className="absolute left-2 top-2.5 h-3.5 w-3.5 text-amber-400" />
          </div>
        </FormItem>
      );
    }}
  />
);

const SocioInput = ({ letter, label, description, field, disabled }: any) => (
  <FormItem className="space-y-1">
    <FormLabel className="text-xs text-slate-400 uppercase font-bold flex flex-col items-start gap-1">
      <span>
        <span className="text-amber-400 text-lg">{letter}</span> {label}
      </span>
      <p className="text-[9px] block italic font-light">{description}</p>
    </FormLabel>
    <Textarea
      {...field}
      disabled={disabled}
      className="bg-[#020817] border-blue-900/30 text-white h-20 text-sm resize-none focus-visible:ring-amber-400/30"
    />
  </FormItem>
);
