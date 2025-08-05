/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomInput from "./CustomInput";
import {
  FieldValues,
  FormProvider,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import CustomSelect from "./CustomSelect";
import { Checkbox } from "@/components/ui/checkbox";
import DynamicDropzone from "./DynamicDropzone";
import { cn, handleFileAccepted } from "@/lib/utils";
import { useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CustomCheckboxGroup from "./CustomCheckboxGroup";
import Image from "next/image";
import ImageCropModal from "../ImageCropModal";

export interface FieldConfig<T> {
  type?:
    | "text"
    | "boolean"
    | "select"
    | "dropzone"
    | "checkbox"
    | "date"
    | "time"
    | "password"
    | "command";
  mask?: "phone" | "date" | null;
  header: string;
  accessorKey: Path<T>;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  renderView?: (data: T) => React.ReactNode;
}

interface CustomModalProps<T extends FieldValues> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void;
  fields: FieldConfig<T>[];
  onInvalid?: (errors: any) => void;
  isEditing: boolean; // Prop para controlar o modo
  setIsEditing: (isEditing: boolean) => void;
  isLoading?: boolean;
  setIsLoading?: (isLoading: boolean) => void;
  onlyView?: boolean;
  page?: string;
  cropShape?: "rect" | "round";
  aspect?: number;
}

const CustomModal = <T extends FieldValues>({
  isOpen,
  onClose,
  title,
  form,
  onSubmit,
  fields,
  onInvalid,
  isEditing,
  isLoading,
  setIsEditing,
  onlyView,
  page,
  cropShape,
  aspect
}: CustomModalProps<T>) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  // Estado para armazenar a referência do formulário para poder usar o setValue
  const [formRef, setFormRef] = useState<any>(null);
  const data = form.getValues();

  // CORREÇÃO: Função wrapper que controla o estado de submissão.
  // Envolvida com useCallback para otimização.
  const handleInternalSubmit = useCallback(
    async (data: T) => {
      setIsSubmitting(true);
      try {
        await onSubmit(data);
      } catch (error) {
        console.error("Erro durante a submissão do formulário:", error);
        // O erro já deve ser tratado pela função onSubmit, mas isso garante um log.
      } finally {
        // Garante que o estado de submissão seja resetado mesmo se ocorrer um erro.
        setIsSubmitting(false);
      }
    },
    [onSubmit]
  );

  const handleFileSelect = (file: File, form: any) => {
    if (file) {
      setFormRef(form); // Salva a referência do formulário
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
      };
    }
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    if (formRef) {
      const croppedFile = new File([croppedImageBlob], "profile_image.jpeg", {
        type: "image/jpeg",
      });
      // Atualiza o valor no react-hook-form com a imagem CORTADA
      formRef.setValue("image", croppedFile, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    setImageToCrop(null); // Fecha o modal
  };

  if (!data) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogContent
          onPointerDownOutside={(e) => {
            if (imageToCrop) {
              e.preventDefault();
            }
          }}
          className={cn(
            "w-full max-w-sm sm:max-w-md md:max-w-3xl bg-[#010d26] text-white border-2 border-[#0126fb]/80 p-6 rounded-md",
            "max-h-[70vh] overflow-y-auto",
            "sm:rounded-lg sm:p-6",
            "scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          )}
        >
          <style>
            {`
            .modal-scroll-area {
              scrollbar-width: thin;
              scrollbar-color: #0126fb #00205e;
            }

            .modal-scroll-area::-webkit-scrollbar {
              width: 8px;
            }

            .modal-scroll-area::-webkit-scrollbar-track {
              background-color: #00205e;
            }

            .modal-scroll-area::-webkit-scrollbar-thumb {
              background-color: #0126fb;
              border-radius: 6px;
            }

            .modal-scroll-area::-webkit-scrollbar-thumb:hover {
              background-color: #0136ff;
            }
              `}
          </style>
          <DialogHeader className="flex-col sm:flex-row items-center justify-between mt-2">
            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
            {!isEditing && !onlyView && (
              <Button
                variant="ghost"
                className="hover:bg-[#f5b719]/10 hover:text-[#f5b719] focus:border-none focus:bg-transparent focus:text-white"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-2 text-[#f5b719]" /> Editar
              </Button>
            )}
            <DialogClose asChild>
              <button className="pl-1 absolute !cursor-pointer right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
                <X className="h-4 w-4 cursor-pointer" />
              </button>
            </DialogClose>
          </DialogHeader>

          <FormProvider {...form}>
            <form
              suppressHydrationWarning
              onSubmit={form.handleSubmit(handleInternalSubmit, onInvalid)}
              className="mt-4 space-y-2 flex flex-col w-full"
            >
              {fields.map((fieldInfo) => {
                const accessorKey = fieldInfo.accessorKey;

                return (
                  <div key={accessorKey as string}>
                    {isEditing
                      ? // Lógica para modo de edição
                        (() => {
                          switch (fieldInfo.type) {
                            case "select":
                              return (
                                <CustomSelect
                                  control={form.control}
                                  name={accessorKey}
                                  label={fieldInfo.header}
                                  placeholder="Selecione uma opção"
                                  options={fieldInfo.options!}
                                />
                              );
                            case "password":
                              return (
                                <CustomInput
                                  form={form}
                                  field={accessorKey}
                                  label={fieldInfo.header}
                                  type={fieldInfo.type}
                                />
                              );
                            case "checkbox":
                              return (
                                <CustomCheckboxGroup
                                  control={form.control}
                                  name={accessorKey}
                                  label={fieldInfo.header}
                                  options={fieldInfo.options!}
                                />
                              );
                            case "boolean":
                              return (
                                <div className="flex items-center space-x-2 pt-8 col-span-1 md:col-span-2">
                                  <Checkbox
                                    id={accessorKey as string}
                                    checked={form.watch(accessorKey)}
                                    onCheckedChange={(v) =>
                                      form.setValue(
                                        accessorKey,
                                        !!v as PathValue<T, Path<T>>
                                      )
                                    }
                                  />
                                  <label
                                    htmlFor={accessorKey as string}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white"
                                  >
                                    {fieldInfo.header}
                                  </label>
                                </div>
                              );
                            case "dropzone":
                              return (
                                <div className="md:col-span-2 mt-2">
                                  <DynamicDropzone
                                    control={form.control}
                                    name={accessorKey}
                                    label={fieldInfo.header}
                                    onFileSelect={(file) =>
                                      handleFileSelect(file, form)
                                    }
                                    progress={uploadProgress}
                                    onFileAccepted={() =>
                                      handleFileAccepted(setUploadProgress)
                                    }
                                    defaultImageUrl={data.imageUrl}
                                    page={page}
                                  />
                                </div>
                              );
                            case "date":
                            case "time":
                              return (
                                <CustomInput
                                  form={form}
                                  field={accessorKey}
                                  label={fieldInfo.header}
                                  type={fieldInfo.type}
                                />
                              );
                            default:
                              return (
                                <CustomInput
                                  form={form}
                                  field={accessorKey}
                                  disabled={fieldInfo.disabled}
                                  label={fieldInfo.header}
                                  mask={fieldInfo.mask}
                                  type="text"
                                />
                              );
                          }
                        })()
                      : // Lógica para modo de visualização
                        (() => {
                          if (
                            fieldInfo.accessorKey === "image" ||
                            fieldInfo.accessorKey === "imageUrl"
                          ) {
                            return (
                              <div className="md:col-span-2 flex flex-col items-center w-full">
                                <label className="text-sm font-semibold text-[#0126fb] mb-2">
                                  {fieldInfo.header}
                                </label>
                                {page === "link-posters" ? (
                                  fieldInfo.renderView ? (
                                    fieldInfo.renderView(data)
                                  ) : (
                                    <Image
                                      width={300}
                                      height={150}
                                      src={data.imageUrl as string}
                                      alt={data.title}
                                      className="object-cover rounded-md aspect-[2/1]"
                                    />
                                  )
                                ) : (
                                  <Avatar className="h-24 w-24 border-2 border-[#0126fb]">
                                    <AvatarImage
                                      src={data.imageUrl}
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="bg-[#0126fb]">
                                      {data.name
                                        ?.split(" ")[0][0]
                                        ?.concat(
                                          data.name?.split(" ")[1]?.[0] || ""
                                        )}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            );
                          }
                          if (fieldInfo.renderView) {
                            return (
                              <div>
                                <label className="text-sm font-semibold text-[#0126fb]">
                                  {fieldInfo.header}
                                </label>
                                <div className="mt-1 w-full rounded-lg border border-transparent  text-white min-h-[44px]">
                                  {fieldInfo.renderView(data)}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div>
                              <label className="text-sm font-semibold text-[#0126fb]">
                                {fieldInfo.header}
                              </label>
                              <div className="mt-1 w-full rounded-lg border border-transparent bg-[#00205e] p-3 text-white min-h-[44px]">
                                {String(data[fieldInfo.accessorKey] || "N/A")}
                              </div>
                            </div>
                          );
                        })()}
                  </div>
                );
              })}
              <DialogFooter className="mt-6">
                {isEditing && !onlyView ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        form.reset();
                        onClose(); // Fechar o modal ao cancelar
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || isSubmitting}
                      className="bg-[#0126fb] hover:bg-[#0126fb]/80"
                    >
                      {isLoading ? "Carregando..." : "Salvar"}
                    </Button>
                  </>
                ) : null}
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </DialogPortal>
      {imageToCrop && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <ImageCropModal
            imageSrc={imageToCrop}
            onClose={() => setImageToCrop(null)}
            onCropComplete={handleCropComplete}
            cropShape={cropShape ? cropShape : "round"}
            aspect={aspect ? aspect : 1}
          />
        </div>
      )}
    </Dialog>
  );
};

export default CustomModal;
