/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { PerfilPageData } from "@/app/(dashboard)/perfil/page";
import CustomCard from "@/app/_components/Global/Custom/CustomCard";
import { CircleUser, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import ImageCropModal from "../../Global/ImageCropModal";
import ExMemberForm from "../../Global/Form/ExMemberForm";
import MemberForm from "../../Global/Form/MemberForm";
import {
  exMemberUpdateSchema,
  memberUpdateSchema,
  MemberUpdateType,
  ExMemberUpdateType,
} from "@/lib/schemas/profileUpdateSchema";
import { checkUserPermission, formatDateForInput, uploadFile } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const PerfilContent = ({ initialData }: { initialData: PerfilPageData }) => {
  const { user: authUser, checkAuth } = useAuth();
  const queryClient = useQueryClient();
  const userId = authUser?.id;

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [formRef, setFormRef] = useState<any>(null);

  const { data, isLoading: isLoadingData } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async (): Promise<PerfilPageData> => {
      // A rota da API agora busca tudo que precisamos de uma vez
      const { data } = await axios.get(
        `${API_URL}/api/users/${userId}/profile-data`
      );
      return data;
    },
    initialData: initialData,
    enabled: !!userId,
  });


  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (formData: MemberUpdateType | ExMemberUpdateType) => {
      const { image, roleHistory, ...restOfData } = formData as any;
      let finalImageUrl = data?.user?.imageUrl;

      const uploadPromises: Promise<any>[] = [];

      // 1. Prepara o upload da imagem de perfil
      if (image && image instanceof File) {
        uploadPromises.push(
          uploadFile({ file: image, olderFileKey: data?.user?.imageUrl })
        );
      }

      // 2. Prepara o upload dos relatórios de gestão
      const finalRoleHistory = await Promise.all(
        (roleHistory || []).map(async (historyItem: any, index: number) => {
          let file: File | undefined;

          // 🔹 Se veio como FileList do input
          if (
            historyItem.managementReport instanceof FileList &&
            historyItem.managementReport.length > 0
          ) {
            file = historyItem.managementReport[0];
          }

          // 🔹 Se já veio como File (caso o form tenha sido setado manualmente)
          if (historyItem.managementReport instanceof File) {
            file = historyItem.managementReport;
          }

          if (file) {
            const oldReport = data?.user?.roleHistory[index]?.managementReport;
            const newReportData = await uploadFile({
              file,
              subfolder: "relatorios",
              olderFileKey: oldReport ? oldReport.url : null, 
            });
            return { ...historyItem, managementReport: newReportData };
          }
          return historyItem;
        })
      );

      const uploadResults = await Promise.all(uploadPromises);
      if (image && image instanceof File) {
        finalImageUrl = uploadResults.shift();
      }

      const finalData = {
        ...restOfData,
        imageUrl: finalImageUrl,
        roleHistory: finalRoleHistory,
      };
      return axios.patch(`${API_URL}/api/users/${userId}`, finalData);
    },
    onSuccess: async () => {
      toast.success("Perfil atualizado com sucesso!");
      await queryClient.invalidateQueries({
        queryKey: ["userProfile", userId],
      });
      await checkAuth();
    },
    onError: (error: any) => {
      toast.error("Erro ao Atualizar", {
        description:
          error.response?.data?.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const handleFileSelect = (file: File, form: any) => {
    if (file) {
      setFormRef(form);
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
      formRef.setValue("image", croppedFile, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    setImageToCrop(null);
  };

  const { user, roles, interestCategories } = data || {};

  const canChangeRole = useMemo(
    () => (user ? checkUserPermission(user, DIRECTORS_ONLY) : false),
    [user]
  );

  const formInitialValues = useMemo(() => {
    if (!user) return undefined;
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
      linkedin: user.linkedin ?? "",
      instagram: user.instagram ?? "",
      currentRoleId: user.currentRoleId ?? "",
      professionalInterests: user.professionalInterests.map(
        (interest) => interest.id
      ),
      roleHistory:
        user.roleHistory.map((history) => ({
          id: history.id,
          roleId: history.roleId,
          semester: history.semester,
          // PASSE O OBJETO DO RELATÓRIO PARA O FORMULÁRIO
          managementReport: history.managementReport,
          managementReportLink: history.managementReportLink ?? '',
        })) ?? [],
      // Ex-Membro
      semesterLeaveEj: user.semesterLeaveEj ?? "",
      aboutEj: user.aboutEj ?? "",
      alumniDreamer: user.alumniDreamer ? "Sim" : "Não",
      isWorking: user.isWorking ? "Sim" : "Não",
      workplace: user.workplace ?? "",
      roles: user.roles.map((role) => role.id),
      otherRole: user.otherRole ?? "",
    };
  }, [user]);

  if (isLoadingData || !user || !roles || !interestCategories) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#f5b719] h-12 w-12" />
      </div>
    );
  }

  return (
    <>
      <CustomCard
        value={0}
        type="introduction"
        description="Mantenha seus dados atualizados para receber as melhores oportunidades."
        title="Meu Perfil"
        icon={CircleUser}
      />
      <div className="md:p-8 p-4 mt-8 bg-[#010d26] rounded-2xl">
        {user.isExMember ? (
          <ExMemberForm
            isLoading={isUpdating}
            onSubmit={(data) => updateProfile(data)}
            roles={roles}
            title="Enviar"
            values={formInitialValues as any}
            schema={exMemberUpdateSchema}
            canChangeRole={false}
            onFileSelect={handleFileSelect}
            interestCategories={interestCategories}
            isPerfilPage={true} // <-- Isso já garante que os campos extras apareçam
          />
        ) : (
          <MemberForm
            isLoading={isUpdating}
            onSubmit={(data) => updateProfile(data)}
            roles={roles}
            values={formInitialValues as any}
            schema={memberUpdateSchema}
            title="Enviar"
            canChangeRole={canChangeRole}
            onFileSelect={handleFileSelect}
            interestCategories={interestCategories}
            view="profile" // <-- Diz ao formulário para mostrar as seções de Interesses e Histórico
          />
        )}
      </div>
      {imageToCrop && (
        <ImageCropModal
          imageSrc={imageToCrop}
          onClose={() => setImageToCrop(null)}
          onCropComplete={handleCropComplete}
          cropShape="round"
          aspect={1}
        />
      )}
    </>
  );
};

export default PerfilContent;
