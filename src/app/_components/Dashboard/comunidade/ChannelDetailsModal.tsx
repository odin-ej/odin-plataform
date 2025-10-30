/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Users,
  Settings,
  ShieldCheck,
  X,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import {
  AreaRoles,
  ChannelMemberRole,
  ChannelType,
  Prisma,
} from "@prisma/client";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel as FieldLabelPrimitive,
  FieldTitle,
} from "@/components/ui/field";
import CommandMultiSelect from "../../Global/Custom/CommandMultiSelect";
import ImageCropModal from "../../Global/ImageCropModal";
import { getLabelForRoleArea } from "@/lib/utils";
import { FullChannel } from "./ChannelContent";
import {
  updateChannelDetails,
  updateChannelImage,
  updateMemberRole,
  removeChannelMember,
  searchUsers,
} from "../../../../lib/actions/community";
import ModalConfirm from "../../Global/ModalConfirm";
import DynamicSignedUrlDropzone from "../../Global/Custom/SignedUrlDynamicDropzone";

// --- TIPOS (Baseado no seu Schema) ---
type FullChannelMember = Prisma.ChannelMemberGetPayload<{
  include: {
    user: {
      include: {
        currentRole: true;
      };
    };
  };
}>;

// --- SCHEMA DO FORMULÁRIO (Completo) ---
const detailsSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres.").max(50),
  description: z
    .string()
    .max(280, "Descrição muito longa.")
    .optional()
    .nullable(),
  type: z.nativeEnum(ChannelType),
  allowExMembers: z.boolean(),
  restrictedToAreas: z.array(z.nativeEnum(AreaRoles)),
  allowedMemberIds: z.array(z.string()), // IDs dos membros permitidos para canais privados
  imageUrl: z.any().optional(), // Adicionado para o dropzone
});
type DetailsForm = z.infer<typeof detailsSchema>;

// --- PROPS DO COMPONENTE ---
interface ChannelDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: FullChannel;
  currentUserId: string;
}

// --- Opções para o MultiSelect ---
const allAreaRoleOptions = Object.values(AreaRoles).map((role) => ({
  label: getLabelForRoleArea(role),
  value: role,
}));

const ChannelDetailsModal = ({
  isOpen,
  onClose,
  channel,
  currentUserId,
}: ChannelDetailsModalProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("geral");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false); // --- Lógica de Permissão ---
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [memberToDelete, setMemberToDelete] =
    useState<FullChannelMember | null>(null);

  const currentUserMember = useMemo(
    () => channel.members.find((m) => m.userId === currentUserId),
    [channel.members, currentUserId]
  );
  const isAdmin = currentUserMember?.role === "ADMIN";
  const currentUserRoleAreas = useMemo(() => {
    // Acessa as áreas através do `currentRole` associado ao usuário dentro do membro
    return currentUserMember?.user?.currentRole?.area ?? [];
  }, [currentUserMember]);
  const isDirector = currentUserRoleAreas.includes(AreaRoles.DIRETORIA);
  const isExMember = currentUserMember?.user?.isExMember; // --- Formulário ---

  const form = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name: channel.name || "",
      description: channel.description || "",
      type: channel.type,
      allowExMembers: channel.allowExMembers,
      restrictedToAreas: channel.restrictedToAreas?.map((area) => area) ?? [],
      imageUrl: channel.imageUrl || null,
    },
  });

  const { data: userOptions, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["allUsersSimple"],
    queryFn: () => searchUsers(""), // Busca inicial (pode refinar com debounce se necessário)
    staleTime: 60 * 1000 * 5,
    enabled: isOpen && form.watch("type") === "PRIVATE", // Só busca se modal aberto E canal for privado
  });

  const safeUserOptions = userOptions ?? [];
  const filteredUserOptions =
    form.watch("allowExMembers") === true && safeUserOptions.length > 0
      ? safeUserOptions.map((u) => ({ label: u.label, value: u.value }))
      : safeUserOptions
          .filter((u) => !u.isExMember)
          .map((u) => ({ label: u.label, value: u.value }));

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: channel.name || "",
        description: channel.description || "",
        type: channel.type,
        allowExMembers: channel.allowExMembers,
        restrictedToAreas: channel.restrictedToAreas?.map((area) => area) ?? [],
        imageUrl: channel.imageUrl || null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, channel.id, form]); // --- Mutações ---

  const { mutate: update, isPending: isUpdatingDetails } = useMutation({
    mutationFn: updateChannelDetails,
    onSuccess: () => {
      toast.success("Canal atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["channel", channel.id] });
      onClose();
    },
    onError: (err: any) =>
      toast.error("Falha ao atualizar", { description: err.message }),
  });

  const { mutate: updateImage } = useMutation({
    mutationFn: updateChannelImage,
    onMutate: () => setIsUploadingImage(true),
    onSuccess: () => {
      toast.success("Imagem do canal atualizada!");
      queryClient.invalidateQueries({ queryKey: ["channel", channel.id] });
      setImageToCrop(null);
    },
    onError: (err: any) =>
      toast.error("Falha ao enviar imagem", { description: err.message }),
    onSettled: () => setIsUploadingImage(false),
  });

  const { mutate: changeRole, isPending: isChangingRole } = useMutation({
    mutationFn: updateMemberRole,
    onSuccess: () => {
      toast.success("Papel do membro atualizado.");
      queryClient.invalidateQueries({ queryKey: ["channel", channel.id] });
    },
    onError: (err: any) =>
      toast.error("Falha ao alterar papel", { description: err.message }),
  });

  const { mutate: removeMember, isPending: isRemovingMember } = useMutation({
    mutationFn: removeChannelMember,
    onSuccess: () => {
      toast.success("Membro removido.");
      queryClient.invalidateQueries({ queryKey: ["channel", channel.id] });
    },
    onError: (err: any) =>
      toast.error("Falha ao remover membro", { description: err.message }),
  }); // --- Handlers ---

  const onSubmit = (data: DetailsForm) => {
    console.log("Submitting form data:", data); // Log para depuração
    const { imageUrl, ...detailsData } = data;

    // Limpa campos não relevantes baseado no tipo ANTES de enviar
    if (detailsData.type === "PUBLIC") {
      detailsData.allowedMemberIds = [];
    } else {
      // Se for PRIVATE
      detailsData.restrictedToAreas = [];
    }

    update({ channelId: channel.id, ...detailsData });
  };

  const handleImageCrop = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], `channel_${channel.id}_avatar.jpg`, {
      type: "image/jpeg",
    });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("channelId", channel.id);
    updateImage(formData);
  };

  const handleRoleChange = (memberId: string, role: ChannelMemberRole) => {
    changeRole({ memberId, role, channelId: channel.id });
  };

  const availableAreaOptions = useMemo(() => {
    if (isDirector) {
      return allAreaRoleOptions; // Diretor pode selecionar tudo
    }
    if (isExMember) {
      return []; // Ex-membro não pode selecionar áreas
    }
    // Outros usuários: suas áreas + Consultoria
    const userAreasSet = new Set(currentUserRoleAreas);
    userAreasSet.add(AreaRoles.CONSULTORIA);
    return allAreaRoleOptions.filter((option) =>
      userAreasSet.has(option.value as AreaRoles)
    );
  }, [isDirector, isExMember, currentUserRoleAreas]);

  const filteredMembers = useMemo(() => {
    if (!memberSearchTerm) {
      return channel.members;
    }
    return channel.members.filter((member) =>
      member.user.name.toLowerCase().includes(memberSearchTerm.toLowerCase())
    );
  }, [channel.members, memberSearchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#010d26] text-white border-gray-700 max-h-[85vh] max-w-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurações do Canal</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error("Erro de validação do formulário:", errors);
              // Foca no primeiro campo com erro, se possível
              const firstErrorField = Object.keys(errors)[0];
              if (firstErrorField) {
                form.setFocus(firstErrorField as keyof DetailsForm); // Tenta focar no campo
              }
              toast.error("Erro de validação", {
                description: "Verifique os campos marcados.",
              });
            })}
            className="flex flex-col flex-grow min-h-0"
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col flex-grow min-h-0"
            >
              <TabsList className="grid w-full grid-cols-3 bg-transparent text-[#f5b719] border-[#f5b719] border-2">
                <TabsTrigger
                  className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                  value="geral"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Geral
                </TabsTrigger>

                <TabsTrigger
                  className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                  value="membros"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Membros ({channel.members.length})
                </TabsTrigger>

                <TabsTrigger
                  className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                  value="configuracoes"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Configurações
                </TabsTrigger>
              </TabsList>
              {/* Aba 1: Geral */}
              <TabsContent
                value="geral"
                className="flex-grow overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-700"
              >
                {/* 1. Substituído CustomInput */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Canal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite o nome do canal"
                          {...field}
                          disabled={!isAdmin || isUpdatingDetails}
                          className="bg-black/30 border-gray-700"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 1. Substituído CustomTextarea */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Qual o propósito deste canal?"
                          {...field}
                          value={field.value ?? ""}
                          disabled={!isAdmin || isUpdatingDetails}
                          className="bg-black/30 border-gray-700"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {channel.isPinned && (
                  <div className="p-4 border border-gray-700 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Imagem do Canal (Fixado)
                    </h4>

                    <p className="text-xs text-gray-400 mb-3">
                      Como este canal é fixado, você pode adicionar uma imagem
                      de capa.
                    </p>

                    <DynamicSignedUrlDropzone
                      control={form.control}
                      name="imageUrl" // O valor deste campo será string (chave S3) ou File
                      label=""
                      progress={isUploadingImage ? 100 : 0}
                      onFileSelect={(file) =>
                        setImageToCrop(URL.createObjectURL(file))
                      }
                      onFileAccepted={() => {}}
                      page="community/channels" // Passa a page para ativar useQuery
                      disabled={!isAdmin || isUploadingImage}
                    />
                  </div>
                )}
              </TabsContent>
              {/* Aba 2: Membros */}
              <TabsContent
                value="membros"
                className="flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700"
              >
                <div className="relative mb-3">
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Pesquisar membros..."
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    disabled={!channel.members || channel.members.length === 0}
                  />
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-700">
                  {filteredMembers.length > 0 ? (
                    filteredMembers
                      .sort((a) => (a.role === "ADMIN" ? -1 : 1))
                      .map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-black/20"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            {" "}
                            {/* Adicionado overflow */}
                            <Avatar className="h-9 w-9 flex-shrink-0">
                              {" "}
                              {/* Evita encolher avatar */}
                              <AvatarImage src={member.user.imageUrl} />
                              <AvatarFallback>
                                {member.user.name.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden">
                              {" "}
                              {/* Adicionado overflow */}
                              <p className="font-semibold text-white truncate">
                                {member.user.name}
                              </p>{" "}
                              {/* Truncate */}
                              <p className="text-xs text-gray-400">
                                {member.role === "ADMIN"
                                  ? "Administrador"
                                  : "Membro"}
                                {member.user.id === channel.createdById &&
                                  " • Criador do Canal"}
                              </p>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {" "}
                              {/* Evita encolher botões */}
                              <Select
                                value={member.role}
                                onValueChange={(value: ChannelMemberRole) =>
                                  handleRoleChange(member.id, value)
                                }
                                disabled={
                                  member.user.id === channel.createdById ||
                                  isChangingRole
                                }
                              >
                                <SelectTrigger className="w-[120px] bg-black/30 border-gray-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#010d26] text-white border-gray-700">
                                  <SelectItem value="ADMIN">Admin</SelectItem>
                                  <SelectItem value="MEMBER">Membro</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-500 hover:text-red-400"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setMemberToDelete(member);
                                }}
                                disabled={
                                  member.user.id === channel.createdById ||
                                  member.userId === currentUserId ||
                                  isRemovingMember
                                }
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="text-center text-gray-400 text-sm py-4">
                      {memberSearchTerm
                        ? "Nenhum membro encontrado."
                        : "Este canal ainda não possui membros."}
                    </p>
                  )}
                </div>
              </TabsContent>
              {/* Aba 3: Configurações */}
              <TabsContent
                value="configuracoes"
                className="flex-grow overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-gray-700"
              >
                {/* 2. Substituído o RadioGroup para usar o novo componente Field */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-semibold">
                        Tipo de Canal
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="space-y-2"
                          disabled={!isAdmin || isUpdatingDetails}
                        >
                          <FieldLabelPrimitive
                            htmlFor="channel-type-public"
                            className="cursor-pointer"
                          >
                            <Field
                              orientation="horizontal"
                              className="p-3 bg-black/20 rounded-lg border border-gray-700 has-[[data-state=checked]]:border-[#f5b719] has-[[data-state=checked]]:bg-[#f5b719]/10"
                            >
                              <FieldContent>
                                <FieldTitle>Público</FieldTitle>
                                <FieldDescription>
                                  Visível para todos ou para membros de áreas
                                  específicas.
                                </FieldDescription>
                              </FieldContent>
                              <RadioGroupItem
                                value="PUBLIC"
                                id="channel-type-public"
                              />
                            </Field>
                          </FieldLabelPrimitive>

                          <FieldLabelPrimitive
                            htmlFor="channel-type-private"
                            className="cursor-pointer"
                          >
                            <Field
                              orientation="horizontal"
                              className="p-3 bg-black/20 rounded-lg border border-gray-700 has-[[data-state=checked]]:border-[#f5b719] has-[[data-state=checked]]:bg-[#f5b719]/10"
                            >
                              <FieldContent>
                                <FieldTitle>Privado</FieldTitle>
                                <FieldDescription>
                                  Visível apenas para membros convidados.
                                </FieldDescription>
                              </FieldContent>
                              <RadioGroupItem
                                value="PRIVATE"
                                id="channel-type-private"
                              />
                            </Field>
                          </FieldLabelPrimitive>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("type") === "PUBLIC" && (
                  <div className="space-y-2">
                    {/* 3. Substituído o placeholder pelo CommandMultiSelect */}
                    <CommandMultiSelect
                      form={form}
                      name="restrictedToAreas"
                      label="Restringir Áreas"
                      placeholder="Selecione as áreas..."
                      options={availableAreaOptions}
                      disabled={!isAdmin || isUpdatingDetails || isExMember}
                    />
                    <p className="text-sm text-gray-400 px-1">
                      Selecione quais áreas podem ver este canal. Se nada for
                      selecionado, todos podem ver.
                    </p>
                    {isExMember && (
                      <p className="text-xs text-yellow-400 px-1">
                        Ex-membros não podem restringir canais por área.
                      </p>
                    )}
                  </div>
                )}

                {form.watch("type") === "PRIVATE" && (
                  <div className="space-y-2">
                    {/* 3. Substituído o placeholder pelo CommandMultiSelect */}
                    <CommandMultiSelect
                      form={form}
                      name="members"
                      label="Membros Permitidos"
                      placeholder={
                        isLoadingUsers
                          ? "Carregando usuários..."
                          : "Selecione os membros..."
                      }
                      options={filteredUserOptions || []}
                      disabled={!isAdmin || isUpdatingDetails || isLoadingUsers}
                    />
                    <p className="text-sm text-gray-400 px-1">
                      Selecione quais membros podem ver este canal.
                    </p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="allowExMembers"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Permitir Ex-Membros
                        </FormLabel>

                        <p className="text-sm text-gray-400">
                          Se ativado, ex-membros poderão visualizar o canal e
                          participar.
                        </p>
                      </div>

                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isAdmin || isUpdatingDetails}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            {/* Botão de Salvar (apenas para abas com formulário) */}
            {activeTab !== "membros" && isAdmin && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <Button
                  className="bg-[#0126fb] hover:bg-[#0126fb]/90 w-full"
                  type="submit"
                  disabled={isUpdatingDetails}
                >
                  {isUpdatingDetails && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>

      {imageToCrop && (
        <ImageCropModal
          imageSrc={imageToCrop}
          onClose={() => setImageToCrop(null)}
          onCropComplete={handleImageCrop}
          cropShape="round"
          aspect={1 / 1} // Aspecto de banner
        />
      )}

      {memberToDelete && (
        <ModalConfirm
          open={!!memberToDelete}
          onCancel={() => setMemberToDelete(null)}
          onConfirm={() =>
            removeMember({ memberId: memberToDelete.id, channelId: channel.id })
          }
          isLoading={isRemovingMember}
          title="Confirmar Exclusão"
          description={`Tem certeza que deseja remover ${memberToDelete.user.name} do grupo?`}
        />
      )}
    </Dialog>
  );
};
export default ChannelDetailsModal;
