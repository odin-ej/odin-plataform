/* eslint-disable @typescript-eslint/no-explicit-any */
// app/auth/forgot-password/RequestStep.tsx

"use client";

import React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

// Funções de autenticação
import { resetPassword } from "aws-amplify/auth";

// Componentes UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import CustomInput from "@/app/_components/Global/Custom/CustomInput";
import { ShieldBan } from "lucide-react";

/**
 * Transforma um e-mail como "fulano@exemplo.com" em "f***o@e***.com".
 * @param email O e-mail a ser ofuscado.
 * @returns O e-mail ofuscado.
 */

// Schema de validação para este passo
const requestSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
});

// Props que o componente espera receber
interface RequestStepProps {
  onRequestSuccess: (email: string) => void;
}

const RequestStep = ({ onRequestSuccess }: RequestStepProps) => {
  // 1. O formulário é inicializado aqui, no momento em que o componente é montado.
  const requestForm = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });

  // 2. A mutation para solicitar o código de reset
  const { mutate: requestCode, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof requestSchema>) => {
      return await resetPassword({ username: data.email });
    },
    onSuccess: (output, variables) => {
      const deliveryDestination = output.nextStep.codeDeliveryDetails?.destination;
      toast.success("Código enviado!", {
        description: `Enviámos um código de verificação para ${deliveryDestination}.`,
      });
      // 3. Notifica o componente pai e passa o email
      onRequestSuccess(variables.email);
    },
    onError: (error: any, variables) => {
      // Por segurança, continua o fluxo mesmo em caso de erro para não
      // permitir que um atacante descubra quais e-mails estão cadastrados.
      toast.success("Verifique o seu e-mail!", {
        description: `Se existir uma conta associada a ${variables.email}, um código de recuperação foi enviado.`,
      });
      // 4. Notifica o componente pai também no erro
      onRequestSuccess(variables.email);
    },
  });

  const handleFormSubmit = (formData: z.infer<typeof requestSchema>) => {
    requestCode(formData);
  };
  
  return (
    <Card className="max-w-lg w-full bg-[#010d26] border border-[#0126fb] rounded-2xl shadow-lg">
      <CardHeader className="flex flex-col items-center gap-4">
        <ShieldBan className="h-16 w-16 text-[#f5b719]" />
        <CardTitle className="text-4xl font-bold text-[#f5b719] text-center">
          Esqueceu a sua senha?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-muted-foreground text-sm">
          Não se preocupe! Introduza o seu e-mail abaixo e nós enviaremos um
          código para que possa redefinir a sua senha.
        </p>
        <Form {...requestForm}>
          <form
            onSubmit={requestForm.handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            <CustomInput
              form={requestForm}
              field="email"
              label="E-mail"
              placeholder="seu@email.com"
              type="email"
            />
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#f5b719] hover:text-white text-white font-bold hover:bg-[#f5b719]/90"
            >
              {isPending ? "Enviando..." : "Enviar Código"}
            </Button>
          </form>
        </Form>
        <div>
          <Link
            href="/login"
            className="text-[#f5b719] text-sm font-semibold hover:underline"
          >
            Lembrei da senha! Voltar
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestStep;