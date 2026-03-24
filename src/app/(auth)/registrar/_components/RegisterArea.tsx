"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExMemberForm from "../../../_components/Global/Form/ExMemberForm";
import MemberForm from "../../../_components/Global/Form/MemberForm";
import { useEffect, useState } from "react";
import { memberSchema, memberType } from "@/lib/schemas/memberFormSchema";
import { exMemberSchema, ExMemberType } from "@/lib/schemas/exMemberFormSchema";
import { toast } from "sonner";
import Link from "next/link";
import RegistrationSentStep from "@/app/_components/Global/Form/RegistrationSentStep";
import { Role, InterestCategory, ProfessionalInterest } from "@prisma/client";
import { orderRolesByHiearchy, uploadFile } from "@/lib/utils";
import ImageCropModal from "@/app/_components/Global/ImageCropModal";
import { useSearchParams } from "next/navigation";
import { UseFormReturn } from "react-hook-form";

interface RegisterAreaProps {
  roles: Role[];
  interestCategories: (InterestCategory & {
    interests: ProfessionalInterest[];
  })[];
}

const RegisterArea = ({ roles, interestCategories }: RegisterAreaProps) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [tabSelected, setTabSelected] = useState<string>("novo");
  // Estado para armazenar a referência do formulário para poder usar o setValue
  const [formRef, setFormRef] = useState<{ setValue: (name: string, value: File, options?: { shouldValidate?: boolean; shouldDirty?: boolean }) => void } | null>(null);
  const query = useSearchParams();

  useEffect(() => {
    const tab = query.get("tab");
    if (tab === "ex") {
      setTabSelected("ex");
    } else {
      setTabSelected("novo");
    }
  }, [query]);
  // Função genérica para submeter o pedido de registo para a nossa API
  const handleSubmitRegistration = async (
    data: memberType | (ExMemberType & { image?: File })
  ) => {
    setIsLoading(true);
    try {

      const roleHistoryForm = data.roleHistory || [];
      const professionalInterests = data.professionalInterests || [];
      if(roleHistoryForm.length === 0) {
        toast.error("Preencha o histórico de cargos corretamente!");
        return;
      }
      if(professionalInterests.length === 0) {
        toast.error("Selecione ao menos um interesse profissional!");
        return;
      }
   
      const { image, roleHistory, ...restOfData } = data as memberType & { image?: File; roleHistory?: { roleId: string; startDate: string; endDate: string; managementReport?: FileList | File }[] };
      let finalImageUrl = '';

      const uploadPromises: Promise<string>[] = [];

      // 1. Prepara o upload da imagem de perfil
      if (image && image instanceof File) {
        uploadPromises.push(
          uploadFile({ file: image }).then((result) =>
            typeof result === "string" ? result : result.url
          )
        );
      }

      // 2. Prepara o upload dos relatórios de gestão
      const finalRoleHistory = await Promise.all(
        (roleHistory || []).map(async (historyItem: { roleId: string; startDate: string; endDate: string; managementReport?: FileList | File | string }) => {
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
            const newReportData = await uploadFile({
              file,
              subfolder: "relatorios",
              olderFileKey: null,
            });
            return { ...historyItem, managementReport: newReportData };
          }
          return historyItem;
        })
      );

      const uploadResults = await Promise.all(uploadPromises);
      if (image && image instanceof File) {
        finalImageUrl = uploadResults.shift() ?? '';
      }

      const finalData = {
        ...restOfData,
        imageUrl: finalImageUrl,
        roleHistory: finalRoleHistory,
      };

      // Passo 4: Envia os dados para a nossa API criar o pedido de registo
      const response = await fetch("/api/registration-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Falha ao enviar o pedido.");
      }

      toast.success("Pedido de registo enviado com sucesso!");
      setIsSubmitted(true); // Muda para o ecrã de sucesso
    } catch (err: unknown) {
      toast.error("Falha no Pedido", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setIsLoading(false); // Reseta o progresso após o fim da operação
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFileSelect = (file: File, form: UseFormReturn<any>) => {
    if (file) {
      setFormRef(form); // Salva a referência do formulário
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
      // Atualiza o valor no react-hook-form com a imagem CORTADA
      formRef.setValue("image", croppedFile, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    setImageToCrop(null); // Fecha o modal
  };

  const orderedRoles = orderRolesByHiearchy(roles);
  // Se o formulário já foi submetido, mostra a mensagem de sucesso.
  if (isSubmitted) {
    return <RegistrationSentStep />;
  }

  return (
    <Tabs
      value={tabSelected}
      onValueChange={setTabSelected}
      className="w-[300px] sm:w-[500px] md:w-[600px] lg:w-[800px] align-center rounded-lg"
    >
      <TabsList className="grid w-full grid-cols-2 bg-[#00205e] text-white font-semibold border-2 border-[#f5b719] p-0 focus:outline-none focus-visible:ring-0 shadow-none">
        <TabsTrigger
          value="novo"
          onClick={() => setTabSelected("novo")}
          className="data-[state=active]:!bg-[#f5b719] !text-white rounded-r-none"
        >
          Novo sócio(a)
        </TabsTrigger>
        <TabsTrigger
          value="ex"
          onClick={() => setTabSelected("ex")}
          className="data-[state=active]:!bg-[#f5b719] !text-white rounded-l-none"
        >
          Ex-membro
        </TabsTrigger>
      </TabsList>

      <TabsContent value="novo">
        <div className="my-8 text-center text-[#f5b719] font-semibold">
          <h2 className="text-3xl lg:text-5xl mb-4">Olá, novo sócio(a)!</h2>
          <p className="text-white text-md font-light italic">
            Preencha com cuidado as informações do cadastro abaixo.
          </p>
          <p className="text-white font-medium">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#f5b719] underline"
            >
              Faça login.
            </Link>
          </p>
        </div>

        <MemberForm
          roles={orderedRoles}
          onSubmit={handleSubmitRegistration}
          isLoading={isLoading}
          schema={memberSchema}
          canChangeRole={true}
          onFileSelect={handleFileSelect}
          interestCategories={interestCategories}
        />
      </TabsContent>

      <TabsContent value="ex">
        <div className="my-8 text-center text-[#f5b719] font-semibold">
          <h2 className="text-3xl lg:text-5xl mb-4">Bem-vindo(a) de volta!</h2>
          <p className="text-white text-md font-light italic">
            Preencha com cuidado as informações do cadastro abaixo.
          </p>
          <p className="text-white font-medium">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#f5b719] underline"
            >
              Faça login.
            </Link>
          </p>
        </div>
        <ExMemberForm
          title="Cadastrar"
          onSubmit={handleSubmitRegistration}
          isLoading={isLoading}
          roles={orderedRoles}
          schema={exMemberSchema}
          onFileSelect={handleFileSelect}
          interestCategories={interestCategories}
        />
      </TabsContent>
      {imageToCrop && (
        <ImageCropModal
          imageSrc={imageToCrop}
          onClose={() => setImageToCrop(null)}
          onCropComplete={handleCropComplete}
          cropShape="round"
          aspect={1}
        />
      )}
    </Tabs>
  );
};

export default RegisterArea;
