// DynamicSignedUrlDropzone.tsx
"use client";

import { FieldValues, Path, Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import SignedUrlDropzoneArea from "./SignedUrlDropzoneArea"; // <-- Importa a nova versão

interface DynamicSignedUrlDropzoneProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  progress: number;
  onFileAccepted: () => void;
  onFileSelect?: (file: File) => void;
  page?: string;
  disabled?: boolean;
  // Não precisa mais do defaultImageUrl aqui, pois será passado pelo 'value' do form
}

const DynamicSignedUrlDropzone = <T extends FieldValues>({
  control,
  name,
  label,
  progress,
  onFileAccepted,
  onFileSelect,
  disabled,
  page,
}: DynamicSignedUrlDropzoneProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      disabled={disabled}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className="text-white font-semibold">{label}</FormLabel>
          <FormControl>
            {/* Usa o SignedUrlDropzoneArea */}
            <SignedUrlDropzoneArea
              page={page}
              onChange={(fileOrNull) => {
                if (fileOrNull && onFileSelect) {
                  onFileSelect(fileOrNull); // Chama crop modal
                } else {
                  field.onChange(fileOrNull); // Atualiza form (File ou null para limpar)
                }
              }}
              onFileAccepted={onFileAccepted}
              // O field.value aqui será File (novo), string (chave S3) ou null
              value={field.value}
              error={!!fieldState.error}
              progress={progress}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default DynamicSignedUrlDropzone;