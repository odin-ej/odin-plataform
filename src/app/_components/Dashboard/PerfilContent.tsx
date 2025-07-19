"use client";
import CustomCard from "@/app/_components/Global/Custom/CustomCard";
import { CircleUser, Loader2 } from "lucide-react";
import MemberForm from "../Global/Form/MemberForm";
import ExMemberForm from "../Global/Form/ExMemberForm";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Role, User, AreaRoles } from ".prisma/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUserPermission, formatDateForInput } from "@/lib/utils";
import {
  exMemberUpdateSchema,
  ExMemberUpdateType,
  memberUpdateSchema,
  MemberUpdateType,
} from "@/lib/schemas/profileUpdateSchema";
import { useRouter } from "next/navigation";

interface PerfilContentProps {
  user: User & { roles: Role[] };
  roles: Role[];
}

const PerfilContent = ({ user, roles }: PerfilContentProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { checkAuth } = useAuth();

  const canChangeRole = checkUserPermission(user, {allowedAreas: [AreaRoles.DIRETORIA]})

  // Função para lidar com a submissão dos formulários
  // CORREÇÃO: O useMemo agora é mais robusto, garantindo que todos os campos
  // tenham um valor padrão para evitar erros de tipagem e de "uncontrolled input".
  const formInitialValues = useMemo(() => {
    if (!user) return null;

    return {
      // Campos comuns a ambos os formulários
      name: user.name,
      email: user.email,
      emailEJ: user.emailEJ,
      phone: user.phone,
      birthDate: formatDateForInput(user.birthDate),
      semesterEntryEj: user.semesterEntryEj,
      course: user.course ?? "",
      about: user.about ?? "",
      image: user.imageUrl,
      password: "", // Inicializa vazio para que o utilizador possa (ou não) mudar
      confPassword: "",
      linkedin: user.linkedin ?? "",
      instagram: user.instagram ?? "",
      roleId: user.currentRoleId ?? "",
      roles: user.roles.map((role) => role.id),
      // Campos específicos para ExMemberForm
      semesterLeaveEj: user.semesterLeaveEj ?? "",
      aboutEj: user.aboutEj ?? "",
      // Garante que o tipo seja "Sim" | "Não", como o Zod espera.
      alumniDreamer: user.alumniDreamer
        ? "Sim"
        : ("Não" as "Sim" | "Não" | undefined),
      // Garante que o array `roles` seja `undefined` se estiver vazio,
      // para não entrar em conflito com a validação `.nonempty()` do Zod.
      otherRole: user.otherRole ?? "",
      isExMember: (user.isExMember ? "Sim" : "Não") as "Sim" | "Não",
    };
  }, [user]);
  const handleSubmit = async (data: MemberUpdateType | ExMemberUpdateType) => {
    if (!user?.id) {
      toast.error("Erro", {
        description:
          "Utilizador não encontrado. Por favor, faça login novamente.",
      });
      return;
    }

    setIsLoading(true);
    try {
      let imageUrl = user.imageUrl; // Começa com a URL da imagem existente.

      // O tipo de `data` pode conter uma propriedade `image` que é File ou string.
      const dataWithImage = data as (MemberUpdateType | ExMemberUpdateType) & {
        image?: File | string;
      };
      // CORREÇÃO: A lógica de upload agora só é executada se `data.image` for uma instância de `File`.
      if (dataWithImage.image && dataWithImage.image instanceof File) {
        const file = dataWithImage.image;

        const presignedUrlResponse = await fetch("/api/s3-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
        });

        if (!presignedUrlResponse.ok) {
          throw new Error("Não foi possível preparar o upload da imagem.");
        }

        const { url, key } = await presignedUrlResponse.json();
        const uploadResponse = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadResponse.ok) {
          throw new Error("Falha ao enviar a imagem para o S3.");
        }

        // Atualiza a `imageUrl` apenas se o upload for bem-sucedido.
        imageUrl = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
      }

      // Prepara os dados finais para a API, removendo o campo `image` e usando `imageUrl`.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { image, ...restOfData } = dataWithImage;
      const finalData = { ...restOfData, imageUrl };

      // Envia os dados para a API para atualizar o utilizador no Prisma.
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao atualizar os dados.");
      }

      toast.success("Perfil atualizado com sucesso!");
      router.refresh();
      await checkAuth();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Erro ao Atualizar", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Mostra um loader enquanto o estado de autenticação está a ser verificado
  if (!formInitialValues) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#00205e]">
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
