"use client";

import { FieldValues, Path, Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import DropzoneArea from "./DropzoneArea";

interface DynamicDropzoneProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  progress: number;
  onFileAccepted: () => void;
  defaultImageUrl?: string;
  page?: string,
}

const DynamicDropzone = <T extends FieldValues>({
  control,
  name,
  label,
  progress,
  onFileAccepted,
  defaultImageUrl,
  page,
}: DynamicDropzoneProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className="text-white font-semibold">{label}</FormLabel>
          <FormControl>
            <DropzoneArea
            page={page}
              onChange={field.onChange}
              onFileAccepted={onFileAccepted}
              value={field.value}
              error={!!fieldState.error}
              progress={progress}
              defaultImageUrl={defaultImageUrl}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};


export default DynamicDropzone;
