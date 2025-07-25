/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExMemberForm from "../../../_components/Global/Form/ExMemberForm";
import MemberForm from "../../../_components/Global/Form/MemberForm";
import { useState } from "react";
import { memberSchema, memberType } from "@/lib/schemas/memberFormSchema";
import { exMemberSchema, ExMemberType } from "@/lib/schemas/exMemberFormSchema";
import { toast } from "sonner";
import Link from "next/link";
import RegistrationSentStep from "@/app/_components/Global/Form/RegistrationSentStep";
import { Role } from "@prisma/client";
import { orderRolesByHiearchy } from "@/lib/utils";

interface RegisterAreaProps {
  roles: Role[];
}

const RegisterArea = ({ roles }: RegisterAreaProps) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Função genérica para submeter o pedido de registo para a nossa API
  const handleSubmitRegistration = async (
    data: memberType | (ExMemberType & { image?: File })
  ) => {
    setIsLoading(true);

    try {
      let imageUrl: string | undefined = undefined;

      // Passo 1: Se uma imagem foi selecionada, faz o upload para o S3
      if (data.image) {
        const file = data.image;

        const presignedUrlResponse = await fetch("/api/s3-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
        });

        if (!presignedUrlResponse.ok) {
          throw new Error("Não foi possível preparar o upload da imagem.");
        }

        const { url, key } = await presignedUrlResponse.json();

        // Usa a nova função de upload que atualiza o estado de progresso
        const uploadResponse = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadResponse.ok) {
          throw new Error("Falha ao enviar a imagem para o S3.");
        }

        imageUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
      }

      // Passo 2: Prepara os dados finais para enviar para a nossa API de criação de pedido
      const finalData = { ...data, imageUrl };

      // Passo 3: Envia os dados para a nossa API criar o pedido de registo
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
    } catch (err: any) {
      toast.error("Falha no Pedido", {
        description: err.message,
      });
    } finally {
      setIsLoading(false); // Reseta o progresso após o fim da operação
    }
  };

  const orderedRoles = orderRolesByHiearchy(roles);
  // Se o formulário já foi submetido, mostra a mensagem de sucesso.
  if (isSubmitted) {
    return <RegistrationSentStep />;
  }

  return (
    <Tabs
      defaultValue="new"
      className="w-[300px] sm:w-[500px] md:w-[600px] lg:w-[800px] align-center rounded-lg"
    >
      <TabsList className="grid w-full grid-cols-2 bg-[#0B2A6B] text-white font-semibold border-2 border-[#f5b719] p-0 focus:outline-none focus-visible:ring-0 shadow-none">
        <TabsTrigger
          value="new"
          className="data-[state=active]:!bg-[#f5b719] !text-white rounded-r-none"
        >
          Novo sócio(a)
        </TabsTrigger>
        <TabsTrigger
          value="ex"
          className="data-[state=active]:!bg-[#f5b719] !text-white rounded-l-none"
        >
          Ex-membro
        </TabsTrigger>
      </TabsList>

      <TabsContent value="new">
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
        />
      </TabsContent>
    </Tabs>
  );
};

export default RegisterArea;
