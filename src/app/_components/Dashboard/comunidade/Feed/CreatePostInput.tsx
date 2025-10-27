/* eslint-disable @typescript-eslint/no-explicit-any */
// components/Feed/CreatePostInput.tsx
"use client";

import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, X, ImagePlus } from "lucide-react";
import { createPost } from "@/lib/actions/feed"; // Ajuste o caminho
import { User } from "@prisma/client";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Schema local para o formulário
const postInputSchema = z.object({
  content: z.string().min(1, "O conteúdo não pode estar vazio.").max(5000),
});
export type PostInputForm = z.infer<typeof postInputSchema>;

interface CreatePostInputProps {
  currentUser: User;
}

const CreatePostInput = ({ currentUser }: CreatePostInputProps) => {
  const queryClient = useQueryClient();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false); // Controla a expansão do input

  const form = useForm<PostInputForm>({
    resolver: zodResolver(postInputSchema),
    defaultValues: { content: "" },
  });

  const { mutate: submitPost, isPending: isSubmittingPost } = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      toast.success("Post publicado!");
      queryClient.invalidateQueries({ queryKey: ["feedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["initialFeedData"] });
      form.reset();
      setAttachments([]);
      setIsExpanded(false); // Recolhe o input após sucesso
    },
    onError: (err: any) => {
      toast.error("Falha ao publicar", { description: err.message });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      // Adiciona novos arquivos, limitando a quantidade se necessário
      const newFiles = Array.from(event.target.files);
      setAttachments((prev) => [...prev, ...newFiles].slice(0, 4)); // Limite de 4 imagens (exemplo)
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PostInputForm) => {
    setIsUploading(true);
    let uploadedAttachmentsData: {
      key: string;
      fileName: string;
      fileType: string;
    }[] = [];
    if (attachments.length > 0) {
      // ... (lógica de upload para API Route /api/community/upload-file) ...
      const uploadFormData = new FormData();
      attachments.forEach((file) => uploadFormData.append("files", file));
      try {
        const response = await fetch("/api/community/upload-file", {
          method: "POST",
          body: uploadFormData,
        });
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Falha no upload: ${errorData}`);
        }
        const result = await response.json();
        uploadedAttachmentsData = result.files;
      } catch (uploadError: any) {
        toast.error("Erro no Upload", { description: uploadError.message });
        setIsUploading(false);
        return;
      }
    }
    setIsUploading(false);

    const postFormData = new FormData();
    postFormData.append("content", data.content);
    postFormData.append("attachments", JSON.stringify(uploadedAttachmentsData));
    submitPost(postFormData);
  };

  const isLoading = isUploading || isSubmittingPost;

  return (
    <div className="bg-[#0c1a4b]/50 p-4 rounded-lg border border-gray-700/50 mb-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0 mt-1">
              <AvatarImage src={currentUser.imageUrl ?? undefined} />
              <AvatarFallback>
                {currentUser.name?.substring(0, 2) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Textarea
                      placeholder={`No que você está pensando, ${currentUser.name}?`}
                      className={cn(
                        "bg-black/30 border border-gray-600 rounded-lg focus-visible:ring-1 focus-visible:ring-[#f5b719] ring-offset-0 resize-none scrollbar-thin scrollbar-thumb-gray-700 w-full",
                        isExpanded
                          ? "min-h-[100px]"
                          : "min-h-[40px] cursor-pointer" // Ajusta altura e cursor
                      )}
                      disabled={isLoading}
                      onClick={() => setIsExpanded(true)} // Expande ao clicar
                      {...field}
                      onBlur={() => !field.value && attachments.length === 0 && setIsExpanded(false)} // Recolhe se vazio ao perder foco (opcional)
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Área de Anexos e Botões (só aparece quando expandido) */}
          {isExpanded && (
            <>
              {/* Preview de Anexos */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-13">
                  {" "}
                  {/* Padding left para alinhar com textarea */}
                  {attachments.map((file, index) => (
                    <div key={index} className="relative aspect-square">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover rounded-md"
                        onLoad={(e) =>
                          URL.revokeObjectURL(
                            (e.target as HTMLImageElement).src
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-80 hover:opacity-100"
                        onClick={() => removeAttachment(index)}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex items-center justify-between pt-2 pl-13">
                {" "}
                {/* Padding left para alinhar */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-[#f5b719]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || attachments.length >= 4}
                >
                  <ImagePlus className="h-6 w-6" />
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0126fb] hover:bg-[#0126fb]/90 rounded-full px-5"
                  disabled={
                    isLoading ||
                    (!form.formState.isDirty && attachments.length === 0)
                  }
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isUploading ? "Enviando..." : "Publicar"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
};

export default CreatePostInput;
