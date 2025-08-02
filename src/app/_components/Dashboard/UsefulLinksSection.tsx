/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AreaRoles, LinkAreas, UsefulLink } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { LinkIcon, Pencil, Plus, Trash2 } from "lucide-react";
import CustomModal, { FieldConfig } from "../Global/Custom/CustomModal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ModalConfirm from "../Global/ModalConfirm";
import Link from "next/link";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUserPermission, getLabelForLinkArea } from "@/lib/utils";
import { LinkFormData, linkSchema } from "@/lib/schemas/linksSchema";
import { HomeContentData } from "@/app/(dashboard)/page";
import Pagination from "../Global/Custom/Pagination";
import LinkSearchInput from "./LinkSearchInput";

const UsefulLinksSection = ({
  links,
  isConsultant,
  isGlobal,
}: {
  links: UsefulLink[];
  isConsultant?: boolean;
  isGlobal?: boolean;
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const [removeLinkId, setRemoveLinkId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      
      if (screenWidth < 640) {
        setItemsPerPage(6);
      }
      if (screenWidth < 768) {
        // Telas pequenas (mobile)
        setItemsPerPage(8);
      } else if (screenWidth < 1280) {
        // Telas médias (tablet)
        setItemsPerPage(10);
      } else {
        // Telas grandes (desktop)
        setItemsPerPage(12);
      }
    };

    // Define o valor inicial ao carregar o componente
    handleResize();

    // Adiciona o "ouvinte" para quando a janela for redimensionada
    window.addEventListener("resize", handleResize);

    // Limpa o "ouvinte" quando o componente for desmontado para evitar memory leaks
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      title: "",
      url: "",
      area: LinkAreas.GERAL,
    },
  });

  const filteredLinks = useMemo(() => {
    if (!searchTerm) return links;
    return links.filter((link) =>
      link.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [links, searchTerm]);

  const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);
  const paginatedLinks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLinks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLinks, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openModal = (link?: UsefulLink) => {
    if (link) {
      setEditingLink(link);
      form.reset({
        title: link.title ?? "",
        url: link.url ?? "",
        area: link.area ?? LinkAreas.GERAL,
      });
    } else {
      setEditingLink(null);
      form.reset({
        title: "",
        url: "",
        area: LinkAreas.GERAL,
      });
    }
    setIsModalOpen(true);
  };

  const { mutate: addLink, isPending: isAdding } = useMutation({
    mutationFn: async (data: LinkFormData) => {
      const response = await axios.post("/api/useful-links", {
        isGlobal,
        ...data,
      });
      return response.data;
    },
    onSuccess: (newLink: UsefulLink) => {
      toast.success("Link adicionado com sucesso!");
      queryClient.setQueryData(
        ["homeDashboardData"],
        (oldData: HomeContentData | undefined) => {
          if (!oldData) return oldData;

          const listKey = isGlobal ? "globalLinks" : "usefulLinks";
          const updatedList = [newLink, ...oldData[listKey]];

          return { ...oldData, [listKey]: updatedList };
        }
      );
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || "Erro ao adicionar link.";
      toast.error(errorMessage);
    },
  });

  const { mutate: updateLink, isPending: isUpdating } = useMutation({
    mutationFn: async (data: LinkFormData & { id: string }) => {
      const response = await axios.patch(`/api/useful-links/${data.id}`, data);
      return response.data;
    },
    onSuccess: (updatedLink: UsefulLink) => {
      toast.success("Link atualizado com sucesso!");
      queryClient.setQueryData(
        ["homeDashboardData"],
        (oldData: HomeContentData | undefined) => {
          if (!oldData) return oldData;

          const listKey = isGlobal ? "globalLinks" : "usefulLinks";
          const updatedList = oldData[listKey].map((link) =>
            link.id === updatedLink.id ? updatedLink : link
          );

          return { ...oldData, [listKey]: updatedList };
        }
      );
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || "Erro ao atualizar link.";
      toast.error(errorMessage);
    },
  });

  const { mutate: deleteLink, isPending: isDeleting } = useMutation({
    mutationFn: async (linkId: string) =>
      axios.delete(`/api/useful-links/${linkId}`),
    onSuccess: (_, deletedLinkId) => {
      toast.success("Link removido com sucesso!");
      queryClient.setQueryData(
        ["homeDashboardData"],
        (oldData: HomeContentData | undefined) => {
          if (!oldData) return oldData;

          const listKey = isGlobal ? "globalLinks" : "usefulLinks";
          const updatedList = oldData[listKey].filter(
            (link) => link.id !== deletedLinkId
          );

          return { ...oldData, [listKey]: updatedList };
        }
      );
      setRemoveLinkId(null);
      setIsConfirmModalOpen(false);
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || "Erro ao remover link.";
      toast.error(errorMessage);
    },
  });

  const handleFormSubmit = (data: LinkFormData) => {
    if (editingLink) {
      updateLink({ ...data, id: editingLink.id });
    } else {
      addLink(data);
    }
  };

  const handleClickDeleteButton = (linkId: string) => {
    setIsConfirmModalOpen(true);
    setRemoveLinkId(linkId);
  };

  const getCreatableAreaOptions = () => {
    if (!user?.currentRole) {
      return [];
    }
    const isDiretor = checkUserPermission(user, {
      allowedAreas: [AreaRoles.DIRETORIA],
    });
    const isTatico = checkUserPermission(user, {
      allowedAreas: [AreaRoles.TATICO],
    });
    const userRoleAreas = user.currentRole.area;

    const allAreaOptions = Object.values(LinkAreas).map((area) => ({
      value: area,
      label: getLabelForLinkArea(area),
    }));

    return allAreaOptions.filter((option) => {
      const areaValue = option.value;
      if (areaValue === LinkAreas.GERAL) return true;
      if (userRoleAreas.includes(areaValue as AreaRoles)) return true;

      const allowedDirectorAreas: LinkAreas[] = [
        LinkAreas.TATICO,
        LinkAreas.CONSULTORIA,
      ];
      if (isDiretor && allowedDirectorAreas.includes(areaValue)) return true;

      if (isTatico && areaValue === LinkAreas.CONSULTORIA) return true;

      return false;
    });
  };

  const areaOptions = getCreatableAreaOptions();

  const globalFields: FieldConfig<LinkFormData>[] = [
    {
      accessorKey: "area",
      header: "Área do Link",
      type: "select",
      options: areaOptions,
    },
  ];

  const modalFields: FieldConfig<LinkFormData>[] = [
    {
      accessorKey: "title",
      header: "Título",
      type: "text",
    },
    {
      accessorKey: "url",
      header: "URL do Link",
      type: "text",
    },
  ];

  if (isGlobal && !isConsultant) {
    modalFields.push(...globalFields);
  }

  return (
    <div className="mt-8 bg-[#010d26] p-6 rounded-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
        <h2 className="text-2xl font-bold text-[#0126fb]">
          Links {isGlobal ? "Globais" : "Úteis"}
        </h2>
        <div className="flex w-full sm:w-auto items-center gap-4">
          <LinkSearchInput onSearchChange={setSearchTerm} />
          {!isConsultant && (
            <Button
              onClick={() => openModal()}
              className="bg-transparent transition text-[#0126fb] hover:bg-[#0126fb]/10"
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {paginatedLinks.map((link) => (
          <div
            key={link.id}
            className="group relative flex items-center justify-between p-4 bg-[#00205e]/10 hover:bg-[#00205e]/20 rounded-lg"
          >
            <Link
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-white font-medium truncate"
            >
              <LinkIcon className="h-5 w-5 text-[#f5b719]" />
              <span className="truncate hover:underline">{link.title}</span>
            </Link>
            {(link.userId === user?.id ||
              checkUserPermission(user, {
                allowedAreas: [AreaRoles.DIRETORIA],
              })) && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:!bg-[#f5b719]/10"
                  onClick={() => openModal(link)}
                >
                  <Pencil className="h-4 w-4 text-[#f5b719]" />
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
            )}
          </div>
        ))}
        {paginatedLinks.length === 0 && (
          <p className="text-gray-400 col-span-full text-center py-4">
            {searchTerm
              ? `Nenhum link encontrado para "${searchTerm}".`
              : "Nenhum link adicionado ainda."}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <CustomModal<LinkFormData>
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLink ? "Editar Link" : "Adicionar Novo Link"}
        form={form}
        isLoading={isAdding || isUpdating}
        onSubmit={handleFormSubmit}
        isEditing={true}
        setIsEditing={() => {}}
        fields={modalFields}
      />

      {removeLinkId && (
        <ModalConfirm
          open={isConfirmModalOpen}
          isLoading={isDeleting}
          onCancel={() => setIsConfirmModalOpen(false)}
          onConfirm={() => deleteLink(removeLinkId)}
        />
      )}
    </div>
  );
};

export default UsefulLinksSection;
