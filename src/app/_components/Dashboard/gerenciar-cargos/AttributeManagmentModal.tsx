"use client";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import CustomInput from "../../Global/Custom/CustomInput";
import CustomSelect from "../../Global/Custom/CustomSelect";
import { Loader2, PlusCircle, Trash2, X } from "lucide-react";
import { InterestCategory, ProfessionalInterest } from "@prisma/client";

// --- SCHEMAS DE VALIDAÇÃO ---
const categorySchema = z.object({
  id: z.string().optional(), // Para edição
  name: z.string().min(3, "Nome da categoria é obrigatório."),
});

const interestSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Nome do interesse é obrigatório."),
  categoryId: z.string().min(1, "Selecione uma categoria."),
});

const formSchema = z.object({
  categories: z.array(categorySchema),
  interests: z.array(interestSchema),
});
type FormValues = z.infer<typeof formSchema>;

interface AttributeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  // mutations para salvar os dados
  onSave: (data: FormValues) => void;
  isLoading: boolean;
  // Dados iniciais
  initialCategories: InterestCategory[];
  initialInterests: (ProfessionalInterest & { category: { id: string } })[];
}

const AttributeManagementModal = ({
  isOpen,
  onClose,
  onSave,
  isLoading,
  initialCategories,
  initialInterests,
}: AttributeManagementModalProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categories: initialCategories,
      interests: initialInterests.map((i) => ({
        ...i,
        categoryId: i.category.id,
      })),
    },
  });

  const {
    fields: categoryFields,
    append: appendCategory,
    remove: removeCategory,
  } = useFieldArray({ control: form.control, name: "categories" });
  const {
    fields: interestFields,
    append: appendInterest,
    remove: removeInterest,
  } = useFieldArray({ control: form.control, name: "interests" });

  const categoryOptions = form
    .watch("categories")
    .filter((c) => c.name && c.name.trim() !== "")
    .map((c) => ({
      // Se a categoria já existe (tem id), use o id. Se for nova, use o nome como valor temporário.
      value: c.id || c.name,
      label: c.name,
    }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogContent className="overflow-y-auto !w-full !max-w-[90vw] max-h-[90vh] bg-[#010d26] border-[#0126fb]/80 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <DialogHeader>
            <DialogTitle className="text-white">
              Gerenciar Interesses e Categorias
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
              <X className="h-6 w-6" color="#f5b719" />
            </DialogClose>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSave)}
              className="space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            >
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto p-1">
                {/* Coluna de Categorias */}
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg">
                  <h3 className="font-semibold text-lg text-[#f5b719]">
                    Categorias
                  </h3>
                  {categoryFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <CustomInput
                        form={form}
                        field={`categories.${index}.name`}
                        label=""
                        placeholder="Nome da Categoria"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCategory(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500 hover:bg-red-500/30" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#f5b719]/10 border-[#f5b719]/90 text-[#f5b719] hover:bg-[#f5b719]/20 transition-colors"
                    onClick={() => appendCategory({ name: "" })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Nova Categoria
                  </Button>
                </div>

                {/* Coluna de Interesses */}
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg">
                  <h3 className="font-semibold text-lg text-[#f5b719]">
                    Interesses Profissionais
                  </h3>
                  {interestFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <CustomInput
                        form={form}
                        field={`interests.${index}.name`}
                        label="Nome"
                        placeholder="Nome do Interesse"
                      />
                      <CustomSelect
                        control={form.control}
                        name={`interests.${index}.categoryId`}
                        label="Categoria"
                        placeholder="Categoria"
                        options={categoryOptions}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInterest(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#f5b719]/10 border-[#f5b719]/90 text-[#f5b719] hover:bg-[#f5b719]/20 transition-colors"
                    onClick={() => appendInterest({ name: "", categoryId: "" })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Novo Interesse
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  className="border-[#f5b719] border-2 text-[#f5b719] hover:bg-[#f5b719]/10 hover:text-[#f5b719]/90 transition-colors"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#f5b719] hover:bg-[#f5b719]/80"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Salvar Tudo"
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

export default AttributeManagementModal;
