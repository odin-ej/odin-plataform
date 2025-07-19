"use client";
import { useState } from "react";
import { toast } from "sonner";
import { UsefulLink } from ".prisma/client";
import { Button } from "@/components/ui/button";
import { LinkIcon, Pencil, Plus, Trash2 } from "lucide-react";
import CustomModal from "../Global/Custom/CustomModal";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import ModalConfirm from "../Global/ModalConfirm";
import Link from "next/link";

export const linkSchema = z.object({
  title: z.string().min(1, "O título é obrigatório."),
  url: z.string().url("Por favor, insira uma URL válida."),
});
type LinkFormData = z.infer<typeof linkSchema>;

const UsefulLinksSection = ({ links }: { links: UsefulLink[] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const [removeLinkId, setRemoveLinkId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter();

  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
  });

  const openModal = (link?: UsefulLink) => {
    if (link) {
      setEditingLink(link);
      form.reset({ title: link.title, url: link.url });
    } else {
      setEditingLink(null);
      form.reset({ title: "", url: "" });
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: LinkFormData) => {
    const endpoint = editingLink
      ? `/api/useful-links/${editingLink.id}`
      : "/api/useful-links";
    const method = editingLink ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      toast.success(
        `Link ${editingLink ? "atualizado" : "adicionado"} com sucesso!`
      );
      setIsModalOpen(false);
      router.refresh(); // Atualiza os dados da página
    } else {
      toast.error("Ocorreu um erro ao salvar o link.");
    }
  };

  const handleDelete = async (linkId: string) => {
    if(isLoading) return;
    try {
      setIsLoading(true)
      const response = await fetch(`/api/useful-links/${linkId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Link removido com sucesso!");
        router.refresh();
      } else {
        toast.error("Falha ao remover o link.");
      }
    } catch (error) {
      console.error("Erro ao remover o link:", error);
      toast.error("Erro ao remover o link.");
    }
    setIsLoading(false)
  };

  const handleClickDeleteButton = (linkId: string) => {
    setIsConfirmModalOpen(true);
    setRemoveLinkId(linkId);
  };

  return (
    <div className="mt-8 bg-[#010d26] p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[#0126fb]">Links Úteis</h2>
        <Button
          onClick={() => openModal()}
          className="bg-transparent transition text-[#0126fb] hover:bg-[#0126fb]/10"
        >
          <Plus className="mr-2 h-4 w-4" /> Adicionar Link
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {links.map((link) => (
          <div
            key={link.id}
            className="group relative flex items-center justify-between p-4 bg-[#00205e]/10 hover:bg-[#00205e]/20 rounded-lg"
          >
            <Link
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-white font-medium truncate underline"
            >
              <LinkIcon className="h-5 w-5 text-[#f5b719]" />
              <span className="truncate">{link.title}</span>
            </Link>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:!bg-[#f5b719]/10"
                onClick={() => openModal(link)}
              >
                <Pencil className="h-4 w-4 text-[#f5b719] hover:!bg-[#f5b719]/10" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-red-500/10"
                onClick={() => handleClickDeleteButton(link.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <p className="text-gray-400 col-span-full text-center py-4">
            Você ainda não adicionou nenhum link.
          </p>
        )}
      </div>

      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLink ? "Editar Link" : "Adicionar Novo Link"}
        form={form}
        onSubmit={handleFormSubmit}
        isEditing={true}
        setIsEditing={() => {}}
        fields={[
          { accessorKey: "title", header: "Título" },
          { accessorKey: "url", header: "URL do Link" },
        ]}
      />

      {typeof removeLinkId === "string" && isConfirmModalOpen && (
        <ModalConfirm
          open={isConfirmModalOpen}
          onCancel={() => setIsConfirmModalOpen(false)}
          onConfirm={() => handleDelete(removeLinkId)}
        />
      )}
    </div>
  );
};

export default UsefulLinksSection;
