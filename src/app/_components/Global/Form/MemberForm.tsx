"use client";

import { DefaultValues, Path, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomInput from "@/app/_components/Global/Custom/CustomInput";
import CustomTextArea from "@/app/_components/Global/Custom/CustomTextArea";
import DynamicDropzone from "@/app/_components/Global/Custom/DynamicDropzone";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import CustomSelect from "../Custom/CustomSelect";
import { Role } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";
import { handleFileAccepted } from "@/lib/utils";
import z from "zod";
import CustomCheckboxGroup from "../Custom/CustomCheckboxGroup";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface MemberFormProps<T extends z.ZodType<any, any, any>> {
  title?: string;
  // Os valores iniciais agora são um `Partial` do tipo inferido do schema.
  values?: Partial<z.infer<T>>;
  canChangeRole?: boolean;
  isLoading: boolean;
  roles: Role[];
  schema: T; // O schema é passado como prop.
  // O `onSubmit` agora é fortemente tipado com base no schema.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFileSelect?: (file: File, form: any) => void;
  onSubmit: (data: z.infer<T>) => void | Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MemberForm = <T extends z.ZodType<any, any, any>>({
  title = "Cadastrar",
  values,
  roles,
  canChangeRole,
  onSubmit,
  onFileSelect,
  schema,
  isLoading,
}: MemberFormProps<T>) => {
  const [uploadProgress, setUploadProgress] = useState(0);

  const defaultFormValues = {
    name: '',
    birthDate: '',
    email: '',
    emailEJ: '',
    password: '',
    confPassword: '',
    phone: '',
    semesterEntryEj: '',
    course: '',
    roleId: '',
    instagram: '',
    linkedin: '',
    roles: [],
    about: '',
    image: undefined,
    imageUrl: '',
  };

  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
   defaultValues: {
      ...defaultFormValues,
      ...values,
    } as DefaultValues<z.infer<T>>,
  });

  const formatedRoles = roles.map((role) => ({
    value: role.id,
    label: role.name
  }))

  const roleOptions = formatedRoles.filter((role) => role.label !== 'Outro');


  const onInvalid = () => {
    toast.error("Formulário Inválido", {
      description: "Por favor, corrija os campos destacados e tente novamente.",
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="pt-4 md:pt-8 space-y-6 text-white"
      >
        {/* Nome e nascimento */}
        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            label="Nome Completo"
            field={"name" as Path<z.infer<T>>}
            form={form}
          />
          <CustomInput
            label="Data de Nascimento"
            field={"birthDate" as Path<z.infer<T>>}
            placeholder="DD/MM/AAAA"
            mask="date"
            form={form}
          />
        </div>

        {/* Emails */}
        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            label="E-mail Pessoal"
            field={"email" as Path<z.infer<T>>}
            form={form}
            type="email"
          />
          <CustomInput
            label="E-mail EJ"
            field={"emailEJ" as Path<z.infer<T>>}
            form={form}
            type="email"
          />
        </div>

        {/* Senhas */}
        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            label="Senha"
            field={"password" as Path<z.infer<T>>}
            form={form}
            type="password"
          />
          <CustomInput
            label="Confirmar Senha"
            field={"confPassword" as Path<z.infer<T>>}
            form={form}
            type="password"
          />
        </div>

        {/* Telefone e semestre */}
        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            label="Telefone"
            field={"phone" as Path<z.infer<T>>}
            mask="phone"
            placeholder="(XX) XXXXX-XXXX"
            form={form}
          />
          <CustomInput
            label="Semestre de Entrada"
            placeholder="Ex: 2025.1"
            field={"semesterEntryEj" as Path<z.infer<T>>}
            form={form}
          />
        </div>

        {/* Curso e Cargo */}
        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            label="Curso"
            field={"course" as Path<z.infer<T>>}
            form={form}
            placeholder="Ex: Administração"
          />
          <CustomSelect
            control={form.control}
            name={"roleId" as Path<z.infer<T>>}
            label="Cargo Atual"
            disabled={canChangeRole ? false : true}
            placeholder="Selecione o seu cargo"
            options={roleOptions}
          />
        </div>

        {/* Redes sociais */}
        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          <CustomInput
            label="Instagram"
            field={"instagram" as Path<z.infer<T>>}
            placeholder='Link ou nome do instagram. Ex.: empresajr'
            form={form}
          />
          <CustomInput
            label="Linkedin"
            field={"linkedin" as Path<z.infer<T>>}
            placeholder="Link do perfil"
            form={form}
          />
        </div>

        <CustomCheckboxGroup
          control={form.control}
          name={"roles" as Path<z.infer<T>>}
          label="Cargos Anteriores (se aplicável)"
          options={roleOptions}
        />

        {/* Sobre você */}
        <CustomTextArea
          label="Sobre você"
          field={"about" as Path<z.infer<T>>}
          form={form}
          placeholder="Fale um pouco sobre você..."
        />

        {/* Dropzone */}
        <DynamicDropzone
          control={form.control}
          name={"image" as Path<z.infer<T>>}
          progress={uploadProgress}
          label="Imagem de Perfil"
          onFileAccepted={() => handleFileAccepted(setUploadProgress)}
          onFileSelect={onFileSelect ? (file) => onFileSelect(file, form) : undefined}
          defaultImageUrl={values?.image}
        />

        <Button
          type="submit"
          disabled={isLoading}
          variant={"default"}
          className={`bg-[#f5b719] cursor-pointer text-white text-md mt-4 hover:bg-[#0126fb] max-w-[150px]`}
        >
          {isLoading || (uploadProgress > 0 && uploadProgress < 100)
            ? "Enviando..."
            : title}
        </Button>
      </form>
    </Form>
  );
};

export default MemberForm;
