/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
// Componentes UI e Tipos
import CustomInput from "../Global/Custom/CustomInput";
import CustomTextArea from "../Global/Custom/CustomTextArea";
import CustomSelect from "../Global/Custom/CustomSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { User, Tag, ActionType, TagAreas } from "@prisma/client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  actionTypeSchema,
  addTagToUsersSchema,
  tagSchema,
} from "@/lib/schemas/pointsSchema";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/lib/auth/AuthProvider";
import CustomCheckboxGroup from "../Global/Custom/CustomCheckboxGroup";

interface AdminActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  allTags: Tag[];
  allActionTypes: ActionType[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getLabelForArea = (area: TagAreas) => {
    switch (area) {
      case TagAreas.GERAL:
        return "Geral";
      case TagAreas.MERCADO:
        return "Mercado";
      case TagAreas.OPERACOES:
        return "Operações";
      case TagAreas.PRESIDENCIA:
        return "Presidência";
      case TagAreas.PROJETOS:
        return "Projetos";
      case TagAreas.PESSOAS:
        return 'Gestão de Pessoas';
      default:
        return area;
    }
  };

const AdminActionsModal = ({
  isOpen,
  onClose,
  allUsers,
  allTags,
  allActionTypes,
}: AdminActionsModalProps) => {
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const {user} = useAuth()
  const addTagForm = useForm<z.infer<typeof addTagToUsersSchema>>({
    resolver: zodResolver(addTagToUsersSchema),
    defaultValues: { userIds: [], tagId: undefined, datePerformed: "" },
  });
  const createActionTypeForm = useForm<z.infer<typeof actionTypeSchema>>({
    resolver: zodResolver(actionTypeSchema),
    defaultValues: { name: "", description: "" },
  });
  const createTagForm = useForm<z.infer<typeof tagSchema>>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      description: "",
      value: '0',
      actionTypeId: undefined,
      datePerformed: "",
      areas: [],
      assignerId: user?.id, 
    },
  });

  const { mutate: addPoints, isPending: isAddingPoints } = useMutation({
    mutationFn: async (data: z.infer<typeof addTagToUsersSchema>) => {
      const { userIds, tagId, datePerformed } = data;
      const realUserIds = userIds.filter((id) => id !== "enterprise-points-id");
      const isEnterpriseSelected = userIds.filter((id) => id === "enterprise-points-id");

      const apiCalls = [];
      if (realUserIds.length > 0) {
        apiCalls.push(
          axios.post(`${API_URL}/api/tags/add-to-users`, {
            userIds: realUserIds,
            tagId,
            datePerformed,
            assignerId: user?.id, // Passa o ID do usuário autenticado
          })
        );
      }
      if (isEnterpriseSelected[0] === "enterprise-points-id") {
        apiCalls.push(
          axios.post(`${API_URL}/api/enterprise-points/add-tags`, {
            tagIds: [tagId],
            datePerformed,
            assignerId: user?.id, // Passa o ID do usuário autenticado
          })
        );
      }
      // Executa chamadas em paralelo
      return Promise.all(apiCalls);
    },
    onSuccess: () => {
      toast.success("Pontos adicionados com sucesso!");
      addTagForm.reset();
      onClose();
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao adicionar pontos", {
        description: error.response?.data?.message,
      }),
  });

  // Função genérica para criar novas entidades (Tags ou Tipos de Ação)
  const { mutate: createTag, isPending: isCreatingTag } = useMutation({
    mutationFn: (data: z.infer<typeof tagSchema>) =>
      axios.post(`${API_URL}/api/tags`, data),
    onSuccess: () => {
      toast.success("Tag criada com sucesso!");
      createTagForm.reset();
      onClose();
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao criar tag", {
        description: error.response?.data?.message,
      }),
  });

  // 3. Mutação para CRIAR TIPO DE AÇÃO
  const { mutate: createActionType, isPending: isCreatingAction } = useMutation(
    {
      mutationFn: (data: z.infer<typeof actionTypeSchema>) =>
        axios.post(`${API_URL}/api/action-types`, data),
      onSuccess: () => {
        toast.success("Tipo de Ação criado com sucesso!");
        createActionTypeForm.reset();
        onClose();
        queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
      },
      onError: (error: any) =>
        toast.error("Erro ao criar ação", {
          description: error.response?.data?.message,
        }),
    }
  );

  const onAddTagSubmit = (formData: z.infer<typeof addTagToUsersSchema>) => {
    // Chame a mutação passando apenas os dados do formulário
    addPoints(formData);
  };

  const onCreateTag = (formData: z.infer<typeof tagSchema>) => {
    // Chame a mutação passando apenas os dados do formulário
    createTag(formData);
  };

  const onCreateActionType = (formData: z.infer<typeof actionTypeSchema>) => {
    // Chame a mutação passando apenas os dados do formulário
    createActionType(formData);
  };

   

  const formatedTagAreas = Object.values(TagAreas).map((area: TagAreas) => ({
    value: area,
    label: getLabelForArea(area),
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogContent className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent w-full max-w-[90vw] sm:max-w-2xl overflow-y-auto bg-[#010d26] border-2 border-[#0126fb] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Ações Administrativas
            </DialogTitle>
            <DialogClose asChild>
              <button className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </DialogHeader>

          <Tabs
            defaultValue="add-points"
            className="w-full mt-4 h-full relative"
          >
            <TabsList className="grid grid-cols-1 h-[150px] sm:h-fit sm:grid-cols-3 gap-2 w-full bg-[#00205e] z-0 relative mb-4">
              <TabsTrigger className="w-full" value="add-points">
                Adicionar Pontos
              </TabsTrigger>
              <TabsTrigger className="w-full" value="create-tag">
                Criar Tag
              </TabsTrigger>
              <TabsTrigger className="w-full" value="create-action">
                Criar Ação
              </TabsTrigger>
            </TabsList>

            <TabsContent value="add-points" className="mt-4">
              <Form {...addTagForm}>
                <form
                  onSubmit={addTagForm.handleSubmit(onAddTagSubmit)}
                  className="space-y-4"
                >
                  {/* CORREÇÃO: Substituído o CustomSelect por um Command (combobox) */}
                  <FormField
                    control={addTagForm.control}
                    name="tagId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tag a ser Adicionada</FormLabel>
                        <Popover
                          open={popoverOpen}
                          onOpenChange={setPopoverOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between bg-transparent hover:bg-gray-700 text-white",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? allTags.find(
                                      (tag) => tag.id === field.value
                                    )?.description
                                  : "Selecione uma tag..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] border-2 border-[#0126fb] bg-[#00205e] text-white">
                            <Command className="bg-[#00205e] w-full scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent ">
                              <CommandInput className="text-white" placeholder="Procurar tag..." />
                              <CommandList>
                                <CommandEmpty>
                                  Nenhuma tag encontrada.
                                </CommandEmpty>
                                <CommandGroup>
                                  {allTags.map((tag) => (
                                    <CommandItem
                                      className="cursor-pointer bg-transparent px-4 py-3 text-white/80 transition-colors duration-200 data-[selected=true]:bg-[#0126fb] data-[selected=true]:text-white hover:!bg-white/10 hover:!text-[#f5b719]"
                                      value={tag.description}
                                      key={tag.id}
                                      onSelect={() => {
                                        addTagForm.setValue("tagId", tag.id);
                                        setPopoverOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          tag.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {tag.description} ({tag.value > 0 && "+"}{tag.value} pts)
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <CustomInput
                    form={addTagForm}
                    field="datePerformed"
                    label="Data de Realização"
                    placeholder="DD/MM/AAAA"
                    mask="date"
                  />
                  <FormField
                    control={addTagForm.control}
                    name="userIds"
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-white">
                          Atribuir a
                        </FormLabel>
                        <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border border-gray-700 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent p-4">
                          {allUsers.map((user) => (
                            <FormField
                              key={user.id}
                              control={addTagForm.control}
                              name="userIds"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(user.id)}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        return checked
                                          ? field.onChange([
                                              ...currentValues,
                                              user.id,
                                            ])
                                          : field.onChange(
                                              currentValues.filter(
                                                (id) => id !== user.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-white">
                                    {user.name}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button className='bg-[#0126fb] hover:bg-[#0126fb]/70' type="submit" disabled={isAddingPoints}>
                    {isAddingPoints ? "Adicionando..." : "Adicionar Pontos"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="create-tag" className="mt-4">
              <Form {...createTagForm}>
                <form
                  onSubmit={createTagForm.handleSubmit(onCreateTag)}
                  className="space-y-4"
                >
                  <CustomInput
                    form={createTagForm}
                    field="description"
                    label="Descrição da Tag"
                    placeholder="Ex: Participação em evento"
                  />
                  <CustomInput
                    form={createTagForm}
                    field="value"
                    label="Valor em Pontos"
                    type="number"
                  />
                  <CustomInput
                    label="Data de Realização"
                    field="datePerformed"
                    placeholder="DD/MM/AAAA"
                    mask="date"
                    form={createTagForm}
                  />
                  <CustomSelect
                    control={createTagForm.control}
                    name="actionTypeId"
                    label="Tipo de Ação Associada"
                    placeholder="Selecione um tipo..."
                    options={allActionTypes.map((at) => ({
                      value: at.id,
                      label: at.name,
                    }))}
                  />
                  <CustomCheckboxGroup
                    control={createTagForm.control}
                    name="areas"
                    label="Áreas da Tag"
                    options={formatedTagAreas}
                  />
                  <Button className='bg-[#0126fb] hover:bg-[#0126fb]/70' type="submit" disabled={isCreatingTag}>
                    {isCreatingTag ? "Criando..." : "Criar Tipo de Tag"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="create-action" className="mt-4">
              <Form {...createActionTypeForm}>
                <form
                  onSubmit={createActionTypeForm.handleSubmit(
                    onCreateActionType
                  )}
                  className="space-y-4"
                >
                  <CustomInput
                    form={createActionTypeForm}
                    field="name"
                    label="Nome da Ação"
                    placeholder="Ex: Evento Interno"
                  />
                  <CustomTextArea
                    form={createActionTypeForm}
                    field="description"
                    label="Descrição"
                    placeholder="Descreva o que este tipo de ação representa..."
                  />
                  <Button className='bg-[#0126fb] hover:bg-[#0126fb]/70' type="submit" disabled={isCreatingAction}>
                    {isCreatingAction ? "Criando..." : "Criar Tipo de Ação"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default AdminActionsModal;
