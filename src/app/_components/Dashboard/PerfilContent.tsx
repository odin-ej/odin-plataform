/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { AreaRoles } from "@prisma/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUserPermission, formatDateForInput } from "@/lib/utils";
import {
  MemberUpdateType,
  ExMemberUpdateType,
  exMemberUpdateSchema,
  memberUpdateSchema,
} from "@/lib/schemas/profileUpdateSchema";

// Seus imports de componentes
import CustomCard from "@/app/_components/Global/Custom/CustomCard";
import { CircleUser, Loader2 } from "lucide-react";
import MemberForm from "../Global/Form/MemberForm";
import ExMemberForm from "../Global/Form/ExMemberForm";
import { PerfilPageData } from "@/app/(dashboard)/perfil/page";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const PerfilContent = ({ initialData }: { initialData: PerfilPageData }) => {
  const { user: authUser, checkAuth } = useAuth();
  const queryClient = useQueryClient();
  const userId = authUser?.id;

  // --- QUERY PARA GERENCIAR OS DADOS DO PERFIL ---
  const { data, isLoading: isLoadingData } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async (): Promise<PerfilPageData> => {
      const [userRes, rolesRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/${userId}`),
        axios.get(`${API_URL}/api/roles`),
      ]);
      return { user: userRes.data, roles: rolesRes.data };
    },
    initialData: initialData,
    enabled: !!userId, // A query só roda se o ID do usuário estiver disponível
  });

  // --- MUTAÇÃO PARA ATUALIZAR O PERFIL ---
  const { mutate: updateProfile, isPending: isLoading } = useMutation({
    mutationFn: async (formData: MemberUpdateType | ExMemberUpdateType) => {
      let imageUrl = data?.user?.imageUrl; // Começa com a URL existente

      // Lógica de upload do S3 agora vive aqui
      const dataWithImage = formData as { image?: File | string };
      if (dataWithImage.image && dataWithImage.image instanceof File) {
        const file = dataWithImage.image;
        const presignedUrlRes = await axios.post("/api/s3-upload", {
          fileType: file.type,
          fileSize: file.size,
          olderFile: imageUrl,
        });
        const { url, key } = presignedUrlRes.data;
        await axios.put(url, file, { headers: { "Content-Type": file.type } });
        imageUrl = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { image, ...restOfData } = dataWithImage;
      const finalData = { ...restOfData, imageUrl };

      // Chamada final para a API de atualização
      return axios.patch(`${API_URL}/api/users/${userId}`, finalData);
    },
    onSuccess: async () => {
      toast.success("Perfil atualizado com sucesso!");
      // Invalida a query para buscar os dados atualizados
      await queryClient.invalidateQueries({
        queryKey: ["userProfile", userId],
      });
      // Atualiza o contexto de autenticação do lado do cliente
      await checkAuth();
    },
    onError: (error: any) => {
      toast.error("Erro ao Atualizar", {
        description: error.response?.data?.message,
      });
    },
  });

  // Handler de submit simplificado
  const handleSubmit = (formData: MemberUpdateType | ExMemberUpdateType) => {
    updateProfile(formData);
  };

  // --- DADOS E LÓGICA DERIVADA ---
  const { user, roles } = data || {};
  const canChangeRole = useMemo(
    () =>
      user
        ? checkUserPermission(user, { allowedAreas: [AreaRoles.DIRETORIA] })
        : false,
    [user]
  );

  const formInitialValues = useMemo(() => {
    if (!user) return null;
    return {
      name: user.name,
      email: user.email,
      emailEJ: user.emailEJ,
      phone: user.phone,
      birthDate: formatDateForInput(user.birthDate),
      semesterEntryEj: user.semesterEntryEj,
      course: user.course ?? "",
      about: user.about ?? "",
      image: user.imageUrl,
      password: "",
      confPassword: "",
      linkedin: user.linkedin ?? "",
      instagram: user.instagram ?? "",
      roleId: user.currentRoleId ?? "",
      roles: user.roles.map((role) => role.id),
      semesterLeaveEj: user.semesterLeaveEj ?? "",
      aboutEj: user.aboutEj ?? "",
      alumniDreamer: (user.alumniDreamer ? "Sim" : "Não") as
        | "Sim"
        | "Não"
        | undefined,
      otherRole: user.otherRole ?? "",
      isWorking: (user.isWorking ? "Sim" : "Não") as "Sim" | "Não",
      workplace: user.workplace,
      isExMember: (user.isExMember ? "Sim" : "Não") as "Sim" | "Não",
    };
  }, [user]);

  if (isLoadingData || !formInitialValues || !user || !roles) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#f5b719] h-12 w-12" />
      </div>
    );
  }

  return (
    <>
      <CustomCard
        type="introduction"
        href="/perfil"
        description="Aqui você pode modificar as informações do seu perfil."
        title="Meu Perfil"
        value="Editar Perfil"
        className="items-center"
        icon={CircleUser}
      />
      <div className="md:p-8 p-4 mt-8 bg-[#010d26] rounded-2xl">
        {user.isExMember ? (
          <ExMemberForm
            isLoading={isLoading}
            onSubmit={handleSubmit}
            schema={exMemberUpdateSchema}
            isPerfilPage={true}
            roles={roles}
            title="Salvar alterações"
            values={formInitialValues as any}
          />
        ) : (
          <MemberForm
            isLoading={isLoading}
            roles={roles}
            schema={memberUpdateSchema}
            onSubmit={handleSubmit}
            title="Salvar alterações"
            values={formInitialValues}
            canChangeRole={canChangeRole}
          />
        )}
      </div>
    </>
  );
};

export default PerfilContent;
