"use client";
import { Link, Loader2, Plus } from "lucide-react";
import CustomCard from "../Global/Custom/CustomCard";
import { LinkPostersPageData } from "@/app/(dashboard)/gerenciar-link-posters/page";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import { LinkPoster, LinkPosterArea } from "@prisma/client";
import { useMemo, useState } from "react";
import Image from "next/image";
import CustomModal, { FieldConfig } from "../Global/Custom/CustomModal";
import {
  linkPostersSchema,
  linkPostersUpdateSchema,
  LinkPostersUpdateValues,
  LinkPostersValues,
} from "@/lib/schemas/linkPostersSchema";
import { toast } from "sonner";
import ModalConfirm from "../Global/ModalConfirm";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import LinkPostersFormModal from "./LinkPostersFormModal";
import { format } from "date-fns";

interface LinkPostersPageContentProps {
  initialData: LinkPostersPageData;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getLinkPosterLabelForArea = (area: string) => {
  switch (area) {
    case LinkPosterArea.EXMEMBROS:
      return "Ex-membros";
    case LinkPosterArea.GERAL:
      return "Geral";
    case LinkPosterArea.HOME:
      return "Pagina Inicial";
    case LinkPosterArea.MEMBROS:
      return "Membros";
    case LinkPosterArea.YGGDRASIL:
      return "Yggdrasil";
    case LinkPosterArea.CONSULTORIA:
      return "Consultoria";
    case LinkPosterArea.TATICO:
      return "Tático";
    case LinkPosterArea.DIRETORIA:
      return "Diretoria";
    default:
      return "";
  }
};

const LinkPostersPageContent = ({
  initialData,
}: LinkPostersPageContentProps) => {
  const [itemToDelete, setItemToDelete] = useState<LinkPoster | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const queryClient = useQueryClient();

  const formCreate = useForm<LinkPostersValues>({
    resolver: zodResolver(linkPostersSchema),
  });

  const formUpdate = useForm<LinkPostersUpdateValues>({
    resolver: zodResolver(linkPostersUpdateSchema),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["linkPosters"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/link-posters`);
      const linksPostersData: LinkPoster[] = response.data;
      return {
        linkPosters: linksPostersData,
      };
    },
    initialData: initialData,
  });

  const { mutate: createLinkPoster, isPending: isCreating } = useMutation({
    mutationFn: async (formData: LinkPostersValues) => {
      let imageUrl = formData.imageUrl;
      if (formData.image instanceof File) {
        const file = formData.image;
        const presignedUrlRes = await axios.post("/api/s3-upload", {
          fileType: file.type,
          fileSize: file.size,
        });
        const { url, key } = presignedUrlRes.data;
        await axios.put(url, file, { headers: { "Content-Type": file.type } });
        imageUrl = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
      }
      const response = await axios.post(`${API_URL}/api/link-posters`, {
        ...formData,
        imageUrl,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Link Poster criado com sucesso!");
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["linkPosters"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error("Erro ao criar", {
        description: error.response?.data?.message,
      });
    },
  });

  const { mutate: deleteLinkPoster, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/api/link-posters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linkPosters"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error("Erro ao deletar", {
        description: error.response?.data?.message,
      });
    },
  });

  const { mutate: updateLinkPoster, isPending: isUpdating } = useMutation({
    mutationFn: async (formData: LinkPostersUpdateValues) => {
      let imageUrl = formData.imageUrl;
      if (formData.image instanceof File) {
        const file = formData.image;
        const presignedUrlRes = await axios.post("/api/s3-upload", {
          fileType: file.type,
          fileSize: file.size,
          olderFile: imageUrl,
        });
        const { url, key } = presignedUrlRes.data;
        await axios.put(url, file, { headers: { "Content-Type": file.type } });
        imageUrl = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
      }
      await axios.patch(`${API_URL}/api/link-posters/${formData.id}`, {
        ...formData,
        imageUrl,
      });
    },
    onSuccess: () => {
      toast.success("Link Poster atualizado com sucesso!");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["linkPosters"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      console.error(error);
      toast.error("Erro ao atualizar", {
        description: error.response?.data?.message,
      });
    },
  });

  const {
    homeLinkPosters,
    geralLinkPosters,
    yggdrasilLinkPosters,
    onlyMembersAndExMembersPosters,
  } = useMemo(() => {
    if (!data.linkPosters)
      return {
        homeLinkPosters: [],
        geralLinkPosters: [],
        yggdrasilLinkPosters: [],
        onlyMembersAndExMembersPosters: [],
      };

    const homeLinkPosters = data.linkPosters.filter((poster) =>
      poster.areas.includes(LinkPosterArea.HOME)
    );
    const geralLinkPosters = data.linkPosters.filter((poster) =>
      poster.areas.includes(LinkPosterArea.GERAL)
    );

    const yggdrasilLinkPosters = data.linkPosters.filter((poster) =>
      poster.areas.includes(LinkPosterArea.YGGDRASIL)
    );

    const onlyMembersAndExMembersPosters = data.linkPosters.filter((poster) =>
      poster.areas.every(
        (area) =>
          area === LinkPosterArea.MEMBROS ||
          area === LinkPosterArea.EXMEMBROS ||
          area === LinkPosterArea.CONSULTORIA ||
          area === LinkPosterArea.TATICO ||
          area === LinkPosterArea.DIRETORIA
      )
    );

    if (!homeLinkPosters || !geralLinkPosters || !yggdrasilLinkPosters)
      return {
        homeLinkPosters: [],
        geralLinkPosters: [],
        yggdrasilLinkPosters: [],
        onlyMembersAndExMembersPosters: [],
      };
    return {
      homeLinkPosters,
      geralLinkPosters,
      yggdrasilLinkPosters,
      onlyMembersAndExMembersPosters,
    };
  }, [data.linkPosters]);

  const handleActionClick = () => {
    formCreate.reset({
      title: "",
      link: "",
      image: undefined,
      areas: [],
      isActive: "Sim",
    });
    setIsCreateModalOpen(true);
  };

  const linkPostersColumns: ColumnDef<LinkPoster>[] = [
    {
      accessorKey: "imageUrl",
      header: "Imagem",

      cell: (row) => (
        <Image
          width={100}
          height={50}
          src={row.imageUrl}
          alt={row.title}
          className="w-25 h-12 object-cover rounded-lg"
        />
      ),
    },
    {
      accessorKey: "title",
      header: "Título",
    },
    {
      accessorKey: "link",
      header: "Link",
    },
    {
      accessorKey: "isActive",
      header: "Ativo",
      cell(row) {
        return row.isActive ? "Sim" : "Não";
      },
    },
    {
      accessorKey: "areas",
      header: "Áreas",
      cell(row) {
        return row.areas
          .map((area) => getLinkPosterLabelForArea(area))
          .join(", ");
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Data de Atualização",
      cell(row) {
        return format(new Date(row.updatedAt), "dd/MM/yyyy");
      },
    },
    {
      accessorKey: "createdAt",
      header: "Data de Criação",
      cell(row) {
        return format(new Date(row.createdAt), "dd/MM/yyyy");
      },
    },
  ];

  const linkPostersFields: FieldConfig<LinkPostersUpdateValues>[] = [
    {
      accessorKey: "title",
      header: "Título",
      type: "text",
    },
    {
      accessorKey: "link",
      header: "Link de redirecionamento",
      type: "text",
    },
    {
      accessorKey: "isActive",
      header: "Ativo",
      type: "select",
      options: [
        { value: "Sim", label: "Sim" },
        { value: "Não", label: "Não" },
      ],
    },
    {
      accessorKey: "areas",
      header: "Áreas",
      type: "checkbox",
      options: [
        { value: "GERAL", label: "Geral" },
        { value: "HOME", label: "Pagina Inicial" },
        { value: "YGGDRASIL", label: "Pagina Yggdrasil" },
        { value: "MEMBROS", label: "Membros" },
        { value: "EXMEMRBOS", label: "Ex-Membros" },
      ],
      renderView(row) {
        return (
          <div className="bg-[#00205e] w-full min-h-11 rounded-lg flex items-center justify-start gap-2 p-3">
            {row.areas
              ?.map((area) => getLinkPosterLabelForArea(area))
              .join(", ")}
          </div>
        );
      },
    },
    {
      accessorKey: "image",
      header: "Imagem",
      type: "dropzone",
      renderView(row) {
        return (
          <Image
            width={300}
            height={150}
            src={row.imageUrl as string}
            alt={row.title}
            className="object-cover rounded-md aspect-[2/1]"
          />
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#010d26]">
        <Loader2 className="animate-spin text-[#f5b719] h-12 w-12" />
        <p>Carregando...</p>
      </div>
    );
  }

  const openModal = (linkPoster: LinkPoster, isButtonEdit: boolean) => {
    formUpdate.reset({
      id: linkPoster.id,
      title: linkPoster.title,
      link: linkPoster.link,
      isActive: linkPoster.isActive ? "Sim" : "Não",
      areas: linkPoster.areas,
      image: undefined,
      imageUrl: linkPoster.imageUrl,
    });
    setIsEditing(isButtonEdit);
    setIsModalOpen(true);
  };

  return (
    <>
      <CustomCard
        icon={Link}
        title="Link Posters"
        value="0"
        type="introduction"
        description="Aqui você pode gerenciar os pôsteres com links do site."
      />

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleActionClick}
          className="bg-[#0126fb] hover:bg-[#0126fb]/80"
        >
          <Plus className="mr-2 h-4 w-4" />
          Criar Novo Link Poster
        </Button>
      </div>

      <div className="flex flex-col gap-6 mt-6">
        <CustomTable<LinkPoster>
          title="Pôsteres Geral"
          columns={linkPostersColumns}
          data={geralLinkPosters}
          filterColumns={["title", "link", "isActive", "areas"]}
          itemsPerPage={10}
          onRowClick={(row) => openModal(row, false)}
          onDelete={(row) => setItemToDelete(row)}
          onEdit={(row) => openModal(row, true)}
          type="noSelection"
        />
        <CustomTable<LinkPoster>
          title="Pôsteres Página Inicial"
          columns={linkPostersColumns}
          data={homeLinkPosters}
          filterColumns={["title", "link", "isActive", "areas"]}
          itemsPerPage={10}
          onRowClick={(row) => openModal(row, false)}
          onDelete={(row) => setItemToDelete(row)}
          onEdit={(row) => openModal(row, true)}
          type="noSelection"
        />
        <CustomTable<LinkPoster>
          title="Pôsteres Página Yggdrasil"
          columns={linkPostersColumns}
          data={yggdrasilLinkPosters}
          filterColumns={["title", "link", "isActive"]}
          itemsPerPage={10}
          onRowClick={(row) => openModal(row, false)}
          onDelete={(row) => setItemToDelete(row)}
          onEdit={(row) => openModal(row, true)}
          type="noSelection"
        />

        <CustomTable<LinkPoster>
          title="Pôsteres para Usuários"
          columns={linkPostersColumns}
          data={onlyMembersAndExMembersPosters}
          filterColumns={["title", "link", "isActive"]}
          itemsPerPage={10}
          onRowClick={(row) => openModal(row, false)}
          onDelete={(row) => setItemToDelete(row)}
          onEdit={(row) => openModal(row, true)}
          type="noSelection"
        />

        <CustomModal
          title={isEditing ? "Editar Link Poster" : "Adicionar Link Poster"}
          fields={linkPostersFields}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          form={formUpdate}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={updateLinkPoster}
          isLoading={isUpdating}
          page="link-posters"
        />
      </div>
      {itemToDelete && (
        <ModalConfirm
          onCancel={() => setItemToDelete(null)}
          onConfirm={() => deleteLinkPoster(itemToDelete.id)}
          open={!!itemToDelete}
          isLoading={isDeleting}
        />
      )}

      {isCreateModalOpen && (
        <LinkPostersFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          form={formCreate}
          onSubmit={createLinkPoster}
          isLoading={isCreating}
        />
      )}
    </>
  );
};

export default LinkPostersPageContent;
