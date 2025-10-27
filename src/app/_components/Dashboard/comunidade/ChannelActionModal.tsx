/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { AreaRoles, User } from "@prisma/client";
import CommandMultiSelect from "../../Global/Custom/CommandMultiSelect";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Globe, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/AuthProvider";
import { FullChannel } from "./ChannelContent";
import { getLabelForRoleArea } from "@/lib/utils";

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="py-3 border-b border-gray-800">
    <p className="text-xs font-semibold uppercase text-gray-500 mb-1">
      {label}
    </p>
    <div className="text-sm text-gray-200 font-medium">{children}</div>
  </div>
);

interface ChannelActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "view" | "edit" | "create";
  channel?: FullChannel;
  allUsers: User[];
  onConfirm: (data: ChannelForm) => void;
  isLoading: boolean;
}
// Schema atualizado
const channelSchema = z
  .object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
    description: z.string().optional(), // pode continuar opcional
    isPinned: z.boolean(),
    allowExMembers: z.boolean(),
    type: z.enum(["PUBLIC", "PRIVATE"]),
    restrictedToAreas: z.array(z.nativeEnum(AreaRoles)),
    memberIds: z.array(z.string()),
  })
  .refine(
    (data) => {
      if (data.type === "PRIVATE" && data.memberIds.length < 1) {
        return false;
      }
      return true;
    },
    {
      message: "Canais privados precisam de pelo menos um outro membro.",
      path: ["memberIds"],
    }
  );

type ChannelForm = z.infer<typeof channelSchema>;

// <<< PASSO 1: Defina os valores padrão que correspondem ao TIPO DE SAÍDA do schema
const defaultChannelValues: ChannelForm = {
  name: "",
  description: "",
  isPinned: false,
  allowExMembers: false,
  type: "PUBLIC",
  restrictedToAreas: [],
  memberIds: [],
};

const ChannelActionModal = ({
  isOpen,
  onClose,
  action,
  channel,
  allUsers,
  onConfirm,
  isLoading,
}: ChannelActionModalProps) => {
  const form = useForm<ChannelForm>({
    resolver: zodResolver(channelSchema),
    defaultValues: defaultChannelValues, // Esta linha resolve o erro de tipo
  });
  const { user: currentUser } = useAuth();
  const [exMemberAllowed, SetExMemberAllowed] = useState(false);
  const isViewing = action === "view";

  useEffect(() => {
    if (channel) {
      form.reset({
        name: channel.name,
        description: channel.description ?? "",
        isPinned: channel.isPinned,
        allowExMembers: channel.allowExMembers,
        type: channel.type === "PRIVATE" ? "PRIVATE" : "PUBLIC", // garante compatibilidade
        restrictedToAreas: channel.restrictedToAreas ?? [],
        memberIds: channel.members.map((m) => m.userId),
      });
    } else {
      form.reset(defaultChannelValues);
    }
  }, [isOpen, channel, form]);


  const userOptions = useMemo(() => {
    const base = allUsers.filter((u) => u.id !== currentUser?.id);
    return exMemberAllowed ? base.map(user => ({
      value: user.id,
      label: user.name,
    })) : base.filter((u) => !u.isExMember).map(user => ({
      value: user.id,
      label: user.name,
    }));
  }, [allUsers, currentUser, exMemberAllowed]);

  const areaOptions = Object.values(AreaRoles).filter((area) => area !== AreaRoles.OUTRO).map((area) => ({
    value: area,
    label: getLabelForRoleArea(area),
  }));

  const onSubmit: SubmitHandler<ChannelForm> = (data) => {
    // Agora, chamamos a função onConfirm que veio das props, passando os dados.
    onConfirm(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#010d26] text-white border-gray-700 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isViewing
              ? "Detalhes do Canal"
              : channel
              ? "Editar Canal"
              : "Criar Novo Canal"}
          </DialogTitle>
        </DialogHeader>

        {isViewing ? (
          <div className="space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
            <InfoRow label="Nome do Canal">{channel?.name}</InfoRow>
            <InfoRow label="Descrição">
              {channel?.description || "Nenhuma descrição."}
            </InfoRow>
            <InfoRow label="Tipo">
              {channel?.type === "PRIVATE" ? "Privado" : "Público"}
            </InfoRow>
            <InfoRow label="Ex-Membros Permitidos?">
              {channel?.allowExMembers ? "Sim" : "Não"}
            </InfoRow>
            <InfoRow label="Áreas com Acesso">
              {channel?.restrictedToAreas.length
                ? channel.restrictedToAreas.map((a: any) => (
                    <Badge key={a} className="mr-1 bg-transparent border-2 border-[#f5b719] text-[#f5b719] ">
                      {getLabelForRoleArea(a)}
                    </Badge>
                  ))
                : "Todas as áreas"}
            </InfoRow>
            <InfoRow label="Membros (Canal Privado)">
              {channel?.members && channel.members.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {channel.members.map((m: any) => (
                    <div key={m.userId} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={m.user.imageUrl} />
                      </Avatar>
                      <span>{m.user.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                "Nenhum membro específico."
              )}
            </InfoRow>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col h-full overflow-hidden"
            >
              <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 flex-grow">
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Canal</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowExMembers"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Permitir Ex-Membros?</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            SetExMemberAllowed(checked);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="pt-4 border-t border-gray-800">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Tabs
                        value={field.value}
                        onValueChange={field.onChange}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2 bg-[#00205e]/30">
                          <TabsTrigger
                            value="PUBLIC"
                            className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                          >
                            <Globe className="mr-2 h-4 w-4" /> Público
                          </TabsTrigger>
                          <TabsTrigger
                            value="PRIVATE"
                            className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                          >
                            <Lock className="mr-2 h-4 w-4" /> Privado
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="PUBLIC" className="pt-4">
                          <CommandMultiSelect
                            form={form}
                            name="restrictedToAreas"
                            label="Restringir por Áreas"
                            options={areaOptions}
                          />
                        </TabsContent>
                        <TabsContent value="PRIVATE" className="pt-4">
                          <CommandMultiSelect
                            form={form}
                            name="memberIds"
                            label="Adicionar Membros"
                            placeholder="Selecione os membros..."
                            options={userOptions}
                          />
                        </TabsContent>
                      </Tabs>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="pt-4 mt-auto">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default ChannelActionModal;
