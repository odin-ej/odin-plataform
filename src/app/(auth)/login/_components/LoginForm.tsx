"use client";
import CustomInput from "@/app/_components/Global/Custom/CustomInput";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useAuth } from "@/lib/auth/AuthProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  password: z.string().min(1, { message: "A senha é obrigatória." }),
});

const LoginForm = () => {
  const router = useRouter();
  const { checkAuth } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    setError(null);
    setIsLoading(true);
    try {
      // Função de login do AWS Amplify/Cognito
      const { isSignedIn } = await signIn({
        username: values.email,
        password: values.password,
      });
      toast.success("Login efetuado com sucesso!");
      if (isSignedIn) {
        await checkAuth();
        router.push("/");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (
        err.name === "UserNotFoundException" ||
        err.name === "NotAuthorizedException"
      ) {
        setError("E-mail ou senha inválidos.");
      } else if (err.name === "UserNotConfirmedException") {
        setError(
          "A sua conta ainda não foi confirmada. Verifique o seu e-mail ou aguarde a aprovação."
        );
      } else {
        setError(err.message || "Ocorreu um erro desconhecido.");
      }
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={form.handleSubmit(handleSignIn)}
      >
        <CustomInput label="E-mail" field="email" form={form} />
        <CustomInput
          label="Senha"
          type="password"
          field="password"
          form={form}
        />

        <Button
          type="submit"
          disabled={isLoading}
          variant={"default"}
          className={`bg-[#f5b719] w-[200px] cursor-pointer text-white text-md mt-4 hover:bg-[#0126fb] max-w-[150px]`}
        >
          {isLoading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;
