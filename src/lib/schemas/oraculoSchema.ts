import { OraculoAreas } from "@prisma/client";
import z from "zod";

export const createFolderSchema = z.object({
  name: z.string().min(1, "O nome da pasta é obrigatório."),
  restrictedToAreas: z.array(z.nativeEnum(OraculoAreas)),
});

export const uploadFileSchema = z.object({
  files: z.custom<FileList>().refine((files) => files?.length > 0, "Selecione pelo menos um arquivo."),
  restrictedToAreas: z.array(z.nativeEnum(OraculoAreas)),
});

export const renameSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  restrictedToAreas: z.array(z.nativeEnum(OraculoAreas)),
});

// Tipos inferidos para uso nos componentes
export type CreateFolderForm = z.infer<typeof createFolderSchema>;
export type UploadFileForm = z.infer<typeof uploadFileSchema>;
export type RenameForm = z.infer<typeof renameSchema>;
export type OraculoFormValues = CreateFolderForm | UploadFileForm | RenameForm;