/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
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
import { Loader2 } from "lucide-react";
import {
  CreateFolderForm,
  createFolderSchema,
  OraculoFormValues,
  RenameForm,
  renameSchema,
  UploadFileForm,
  uploadFileSchema,
} from "@/lib/schemas/oraculoSchema";
import z from "zod";
import CustomCheckboxGroup from "../../Global/Custom/CustomCheckboxGroup";
import { AreaRoles, OraculoAreas } from "@prisma/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUserPermission, getLabelForLinkArea } from "@/lib/utils";

interface OraculoActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: "createFolder" | "uploadFile" | "rename";
  itemToEdit?: {
    id: string;
    name: string;
    type: "file" | "folder";
    restrictedToAreas: OraculoAreas[];
  };
  currentFolderId: string | null;
  onConfirm: (data: {
    type: "createFolder" | "uploadFile" | "rename";
    payload: any;
  }) => void;
  isLoading: boolean;
}

const OraculoActionModal = ({
  isOpen,
  onClose,
  actionType,
  itemToEdit,
  currentFolderId,
  onConfirm,
  isLoading,
}: OraculoActionModalProps) => {
  // O schema é escolhido dinamicamente com base na ação
  const { user } = useAuth();
  console.log(itemToEdit);
  const activeSchema = useMemo(() => {
    switch (actionType) {
      case "rename":
        return renameSchema;
      case "createFolder":
        return createFolderSchema;
      case "uploadFile":
        return uploadFileSchema;
      default:
        return z.object({}); // Fallback seguro
    }
  }, [actionType]);

  const form = useForm<any>({
    // Usar 'any' aqui simplifica a tipagem dinâmica
    resolver: zodResolver(activeSchema),
  });

  // Efeito para resetar o formulário com os valores corretos quando o modal abre
  useEffect(() => {
    if (isOpen) {
      if (actionType === "rename" || actionType === "createFolder") {
        form.reset({
          name: itemToEdit?.name || "",
          restrictedToAreas: itemToEdit?.restrictedToAreas ?? [],
        });
      } else if (actionType === "uploadFile") {
        form.reset({
          files: undefined,
          restrictedToAreas: itemToEdit?.restrictedToAreas ?? [],
        });
      }
    }
  }, [isOpen, actionType, itemToEdit, form]);

  const onSubmit = (data: OraculoFormValues) => {
    if (actionType === "rename") {
      onConfirm({
        type: "rename",
        payload: { item: itemToEdit, name: (data as RenameForm).name, restrictedToAreas: (data as RenameForm).restrictedToAreas },
      });
    } else {
      const formData = new FormData();
      formData.append("parentId", currentFolderId || "");

      if (actionType === "createFolder") {
        formData.append("type", "folder");
        formData.append("name", (data as CreateFolderForm).name);

    
        (data.restrictedToAreas ?? []).forEach((area) =>
          formData.append("restrictedToAreas", area)
        );

        onConfirm({ type: "createFolder", payload: formData });
      } else if (actionType === "uploadFile") {
        formData.append("type", "file");

        const fileList = (data as UploadFileForm).files;
        Array.from(fileList).forEach((file) =>
          formData.append("files", file as File)
        );

    
        (data.restrictedToAreas ?? []).forEach((area) =>
          formData.append("restrictedToAreas", area)
        );

        onConfirm({ type: "uploadFile", payload: formData });
      }
    }
  };

  const getTitle = () => {
    if (actionType === "rename")
      return `Renomear "${itemToEdit?.name ?? "Item"}"`;
    if (actionType === "createFolder") return "Criar Nova Pasta";
    if (actionType === "uploadFile") return "Enviar Arquivos";
    return "Ação no Oráculo";
  };

  const getCreatableAreaOptions = () => {
    if (!user?.currentRole) {
      return [];
    }
    const isDirector = checkUserPermission(user, {
      allowedAreas: [AreaRoles.DIRETORIA],
    });
    const isTatico = checkUserPermission(user, {
      allowedAreas: [AreaRoles.TATICO],
    });
    const userRoleAreas = user.currentRole.area;

    const allAreaOptions = Object.values(OraculoAreas).map((area) => ({
      value: area,
      label: getLabelForLinkArea(area),
    }));

    return allAreaOptions.filter((option) => {
      const areaValue = option.value;
      if (areaValue === OraculoAreas.GERAL || isDirector) return true;
      if (userRoleAreas.includes(areaValue as AreaRoles)) return true;

      const allowedDirectorAreas: OraculoAreas[] = [
        OraculoAreas.TATICO,
        OraculoAreas.CONSULTORIA,
      ];
      if (isDirector && allowedDirectorAreas.includes(areaValue)) return true;

      if (isTatico && areaValue === OraculoAreas.CONSULTORIA) return true;

      return false;
    });
  };

  const areaOptions = getCreatableAreaOptions();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose(); // só fecha quando realmente for false
      }}
    >
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogContent className="bg-[#010d26] text-white border-2 border-gray-700">
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 pt-4"
            >
              {/* Renderiza o campo de NOME para Renomear ou Criar Pasta */}
              {(actionType === "rename" || actionType === "createFolder") && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {actionType === "rename"
                            ? "Novo Nome"
                            : "Nome da Pasta"}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Relatórios 2025" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <CustomCheckboxGroup
                    control={form.control}
                    name="restrictedToAreas"
                    label="Restringir Acesso a Áreas"
                    options={areaOptions}
                  />
                </>
              )}

              {/* Renderiza o campo de UPLOAD para Enviar Arquivo */}
              {actionType === "uploadFile" && (
                <>
                  <FormField
                    control={form.control}
                    name="files"
                    render={() => (
                      <FormItem>
                        <FormLabel>Selecione um ou mais arquivos</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            multiple
                            className="cursor-pointer file:text-[#f5b719] file:border-0 file:bg-transparent file:underline file:underline-offset-4 hover:file:text-[#f5b719]/80"
                            {...form.register("files")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <CustomCheckboxGroup
                    control={form.control}
                    name="restrictedToAreas"
                    label="Restringir Acesso a Áreas"
                    options={areaOptions}
                  />
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onClose()}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Confirmar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
export default OraculoActionModal;
