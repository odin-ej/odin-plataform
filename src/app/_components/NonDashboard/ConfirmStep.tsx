/* eslint-disable @typescript-eslint/no-explicit-any */
// app/auth/forgot-password/ConfirmStep.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

// Funções de autenticação
import { confirmResetPassword, fetchAuthSession, resetPassword, signIn } from "aws-amplify/auth";

// Componentes UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CustomInput from "@/app/_components/Global/Custom/CustomInput";
import { MailCheck, KeyRound } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const obfuscateEmail = (email: string): string => {
  if (!email || !email.includes("@")) {
    return "um endereço de e-mail"; // Fallback seguro
  }

  const [localPart, domain] = email.split("@");

  const maskedLocalPart =
    localPart.length > 2
      ? `${localPart[0]}***${localPart[localPart.length - 1]}`
      : `${localPart[0]}***`;

  return `${maskedLocalPart}@${domain}`;
}


// Schema de validação (sem alterações)
const confirmSchema = z
  .object({
    code: z.string().min(6, { message: "O código deve ter 6 dígitos." }),
    newPassword: z
      .string()
      .min(8, "A senha deve ter no mínimo 8 caracteres.")
      .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula.")
      .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
      .regex(/[0-9]/, "A senha deve conter pelo menos um número.")
      .regex(
        /[^a-zA-Z0-9]/,
        "A senha deve conter pelo menos um caractere especial (ex: !@#$%)."
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

// Props que o componente espera receber
interface ConfirmStepProps {
  email: string;
  onConfirmSuccess: () => void;
}

const ConfirmStep = ({ email, onConfirmSuccess }: ConfirmStepProps) => {
  // --- NOVOS ESTADOS PARA O TEMPORIZADOR ---
  const [timer, setTimer] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(true);

  const confirmForm = useForm<z.infer<typeof confirmSchema>>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { code: "", newPassword: "", confirmPassword: "" },
  });

  // --- EFEITO PARA CONTROLAR O TEMPORIZADOR ---
  useEffect(() => {
    if (!isTimerActive) return;

    if (timer === 0) {
      setIsTimerActive(false);
      return;
    }

    const intervalId = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId); // Limpeza do intervalo
  }, [timer, isTimerActive]);

  // --- NOVA MUTATION PARA REENVIAR O CÓDIGO ---
  const { mutate: resendCode, isPending: isResending } = useMutation({
    mutationFn: () => resetPassword({ username: email }),
    onSuccess: () => {
      toast.success("Novo código enviado!", {
        description: `Verifique seu e-mail ${obfuscateEmail(
          email)}
         novamente.`,
      });
      // Reinicia o temporizador
      setTimer(60);
      setIsTimerActive(true);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onError: (error: any) => {
      toast.error("Erro ao reenviar", {
        description: "Não foi possível reenviar o código.",
      });
    },
  });

  // --- MUTATION PRINCIPAL COM TRATAMENTO DE ERRO MELHORADO ---
  const { mutate: updatePassword, isPending: isLoadingConfirm } = useMutation({
    mutationFn: async (data: z.infer<typeof confirmSchema>) => {
      // PASSO 1: Confirmar o reset da senha diretamente com a AWS
      await confirmResetPassword({
        username: email,
        confirmationCode: data.code,
        newPassword: data.newPassword,
      });

      // PASSO 2: Fazer login automático para obter uma sessão segura
      await signIn({
        username: email,
        password: data.newPassword,
      });

      // PASSO 3: Obter o token JWT da sessão recém-criada
      const { tokens } = await fetchAuthSession({ forceRefresh: true });
      const idToken = tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error("Não foi possível obter a sessão para autenticação.");
      }

      // PASSO 4: Chamar sua API com o token de autorização
      return axios.patch(
        `${API_URL}/api/users/update-password`,
        {
          email: email,
          password: data.newPassword, // Enviamos a senha para o hash no backend
        },
        {
          headers: {
            // Enviando o token para o backend validar
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
    },
    onSuccess: () => {
      onConfirmSuccess();
    },
    onError: (error: any) => {
      // Tratamento de erro específico para AWS Cognito
      if (error.name === "CodeMismatchException") {
        toast.error("Código Inválido", {
          description:
            "O código inserido não corresponde. Verifique e tente novamente.",
        });
        confirmForm.setFocus("code"); // Foca no campo do código para facilitar a correção
      } else if (error.name === "LimitExceededException") {
        toast.error("Muitas tentativas", {
          description:
            "Você excedeu o limite de tentativas. Por favor, aguarde antes de tentar novamente.",
        });
      } else {
        toast.error("Erro ao redefinir", {
          description: error.message || "Ocorreu um erro inesperado.",
        });
      }
    },
  });

  return (
    <Card className="max-w-lg w-full bg-[#010d26] border border-[#0126fb] rounded-2xl shadow-lg">
      <CardHeader className="flex flex-col items-center gap-2 sm:gap-4">
        <MailCheck className="h-12 w-12 sm:h-16 sm:w-16 text-[#f5b719]" />
        <CardTitle className="text-xl sm:text-3xl font-bold text-white text-center">
          Verifique o seu E-mail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-center text-sm">
          Introduza o código que enviamos para <b>{obfuscateEmail(email)}</b>.
        </p>
        <Form {...confirmForm}>
          <form
            onSubmit={confirmForm.handleSubmit((formData) =>
              updatePassword(formData)
            )}
            className="space-y-4"
          >
            <CustomInput
              form={confirmForm}
              field="code"
              label="Código de Verificação"
              placeholder="123456"
            />

            {/* --- SEÇÃO DE REENVIO DE CÓDIGO --- */}
            <div className="text-center text-sm">
              {isTimerActive ? (
                <p className="text-muted-foreground">
                  Poderá reenviar o código em {timer}s
                </p>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold text-[#f5b719] hover:text-[#f5b719]/90"
                  onClick={() => resendCode()}
                  disabled={isResending}
                >
                  {isResending
                    ? "Reenviando..."
                    : "Não recebeu? Reenviar código"}
                </Button>
              )}
            </div>

            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 sm:gap-4">
                <KeyRound className="h-12 w-12 sm:h-16 sm:w-16 text-[#f5b719]" />
                <h2 className="text-xl sm:text-3xl font-bold text-white text-center">
                  Defina sua nova senha
                </h2>
                <p className="text-muted-foreground text-center text-sm">
                  Após preencher o código, defina sua nova senha para acessar a
                  plataforma.
                </p>
              </div>
              <CustomInput
                form={confirmForm}
                field="newPassword"
                label="Nova Senha"
                placeholder="Senha123!"
                type="password"
              />
              <CustomInput
                form={confirmForm}
                field="confirmPassword"
                label="Confirmar Nova Senha"
                placeholder="Senha123!"
                type="password"
              />
              <Button
                type="submit"
                disabled={isLoadingConfirm}
                className="w-full bg-[#f5b719] hover:text-white text-white font-bold hover:bg-[#f5b719]/90"
              >
                {isLoadingConfirm ? "Redefinindo..." : "Redefinir Senha"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ConfirmStep;
