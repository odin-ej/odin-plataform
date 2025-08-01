/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { DefaultValues, FormProvider, Path, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import CustomInput from "@/app/_components/Global/Custom/CustomInput";
import CustomTextArea from "@/app/_components/Global/Custom/CustomTextArea";
import DynamicDropzone from "@/app/_components/Global/Custom/DynamicDropzone";
import { Role } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";
import CustomSelect from "../Custom/CustomSelect";
import CustomCheckboxGroup from "../Custom/CustomCheckboxGroup";
import z from "zod";

interface ExMemberFormProps<T extends z.ZodType<any, any, any>> {
  isLoading: boolean;
  onSubmit: (data: z.infer<T>) => void | Promise<void>;
  roles: Role[];
  title: string;
  // Os valores iniciais são um `Partial` do tipo inferido do schema.
  values?: Partial<z.infer<T>>;
  schema: T;
  canChangeRole?: boolean;
  isPerfilPage?: boolean;
}

const ExMemberForm = <T extends z.ZodType<any, any, any>>({
  title = "Cadastrar",
  values,
  onSubmit,
  schema,
  isLoading,
  roles,
  isPerfilPage,
}: ExMemberFormProps<T>) => {
  const [uploadProgress, setUploadProgress] = useState(0);

  const defaultValues = {
    name: "",
    birthDate: "",
    email: "",
    emailEJ: "",
    semesterEntryEj: "",
    course: "",
    phone: "",
    instagram: "",
    linkedin: "",
    about: "",
    image: undefined,
    imageUrl: "",
    isExMember: "Sim",
    alumniDreamer: "Não",
    password: "",
    confPassword: "",
    semesterLeaveEj: "",
    aboutEj: "",
    roles: [],
    otherRole: "",
  };

  const defaultFormPerfilValues = {
    ...defaultValues,
    ...(values as DefaultValues<z.infer<T>>),
    isExMember: "Sim",
    alumniDreamer: (values as any)?.alumniDreamer ? "Sim" : "Não",
  };

  const defaultFormRegisterValues = {
    ...defaultValues,
    ...(values as DefaultValues<z.infer<T>>),
    isExMember: "Sim",
    workplace: "",
  };

  const defaultFormValues = isPerfilPage
    ? defaultFormPerfilValues
    : defaultFormRegisterValues;

  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: defaultFormValues,
  });

  const handleFileAccepted = () => {
    // Define o progresso para 1 imediatamente para acionar a UI de loading.
    setUploadProgress(1);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const watchedRoles = form.watch("roles" as Path<z.infer<T>>);
  // Encontra o ID do cargo "Outro" para a verificação
  const otherRoleId = roles.find((role) => role.name === "Outro")?.id;
  // A condição agora verifica se o array de IDs inclui o ID do cargo "Outro"
  const showOtherRoleInput =
    Array.isArray(watchedRoles) &&
    otherRoleId &&
    watchedRoles.includes(otherRoleId);

  const isWorking = form.watch("isWorking" as Path<z.infer<T>>) === 'Sim';
  const onInvalid = () => {
    toast.error("Formulário Inválido", {
      description: "Por favor, corrija os campos destacados e tente novamente.",
    });
  };

  const handleFormSubmission = (data: z.infer<T>) => {
    let finalData = { ...data };
    if (isPerfilPage) {
      finalData = {
        ...finalData,
        alumniDreamer: form.getValues("alumniDreamer" as Path<z.infer<T>>),
      };
    }
    onSubmit(finalData);
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmission, onInvalid)}
        className="space-y-6 pt-4 md:pt-8 text-white rounded-lg"
      >
        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            form={form}
            field={"name" as Path<z.infer<T>>}
            label="Nome Completo"
          />
          <CustomInput
            form={form}
            field={"birthDate" as Path<z.infer<T>>}
            mask="date"
            label="Data de Nascimento"
            placeholder="DD/MM/AAAA"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            form={form}
            field={"email" as Path<z.infer<T>>}
            label="E-mail Pessoal"
            type="email"
          />
          <CustomInput
            form={form}
            field={"emailEJ" as Path<z.infer<T>>}
            label="E-mail EJ"
            type="email"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            form={form}
            field={"password" as Path<z.infer<T>>}
            label="Senha"
            type="password"
          />
          <CustomInput
            form={form}
            field={"confPassword" as Path<z.infer<T>>}
            label="Confirmar Senha"
            type="password"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            form={form}
            field={"semesterEntryEj" as Path<z.infer<T>>}
            label="Semestre de Entrada"
            placeholder="Ex: 2022.1"
          />
          <CustomInput
            form={form}
            field={"semesterLeaveEj" as Path<z.infer<T>>}
            label="Semestre de Saída"
            placeholder="Ex: 2024.1"
          />
          <CustomSelect
            control={form.control}
            name={"alumniDreamer" as Path<z.infer<T>>}
            label="Alumni Dreamer"
            disabled={isPerfilPage}
            placeholder="Selecione uma opção"
            options={[
              { value: "Sim", label: "Sim" },
              { value: "Não", label: "Não" },
            ]}
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            form={form}
            field={"course" as Path<z.infer<T>>}
            label="Curso"
            placeholder="Ex: Administração"
          />
          <CustomInput
            form={form}
            field={"phone" as Path<z.infer<T>>}
            mask="phone"
            label="Telefone"
            placeholder="(XX) XXXXX-XXXX"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            form={form}
            field={"instagram" as Path<z.infer<T>>}
            label="Instagram"
            placeholder={"Link ou Nome do instagram. Ex.: empresajr"}
          />
          <CustomInput
            form={form}
            field={"linkedin" as Path<z.infer<T>>}
            label="Linkedin (URL)"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomSelect
            control={form.control}
            name={"isWorking" as Path<z.infer<T>>}
            label="Está trabalhando?"
            placeholder="Selecione uma opção"
            options={[
              { value: "Sim", label: "Sim" },
              { value: "Não", label: "Não" },
            ]}
          />  
          <CustomInput form={form} field={"workplace" as Path<z.infer<T>>} label="Local de Trabalho" disabled={!isWorking} placeholder='Empresa. Ex.: Sanar' />
        </div>

        <CustomCheckboxGroup
          control={form.control}
          name={"roles" as Path<z.infer<T>>}
          label="Cargos na EJ"
          options={roles.map((role) => ({
            value: role.id,
            label: role.name,
          }))}
        />

        {showOtherRoleInput ? (
          <div className="pl-2 pt-2">
            <CustomInput
              label="Qual cargo?"
              field={"otherRole" as Path<z.infer<T>>}
              form={form}
              placeholder="Digite o cargo"
            />
          </div>
        ) : null}

        <CustomTextArea
          form={form}
          field={"about" as Path<z.infer<T>>}
          label="Sobre você"
          placeholder="Fale um pouco sobre seus hobbies, interesses, etc."
        />
        <CustomTextArea
          form={form}
          field={"aboutEj" as Path<z.infer<T>>}
          label="Sua experiência na EJ"
          placeholder="Descreva seus principais projetos e aprendizados."
        />

        <DynamicDropzone
          control={form.control}
          name={"image" as Path<z.infer<T>>}
          onFileAccepted={handleFileAccepted}
          defaultImageUrl={values?.image}
          progress={uploadProgress}
          label="Imagem de Perfil"
        />

        <Button
          type="submit"
          disabled={isLoading}
          variant={"default"}
          className={`bg-[#f5b719] cursor-pointer text-white text-md mt-4 hover:bg-[#0126fb] max-w-[150px]`}
        >
          {isLoading ? "Enviando..." : title}
        </Button>
      </form>
    </FormProvider>
  );
};

export default ExMemberForm;
