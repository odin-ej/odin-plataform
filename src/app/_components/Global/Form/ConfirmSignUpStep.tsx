"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const confirmSignUpSchema = z.object({
  confirmationCode: z.string().min(6, { message: "O código deve ter 6 dígitos." }),
});


const ConfirmSignUpStep = ({ email, onConfirm }: { email: string; onConfirm: (data: { confirmationCode: string }) => void; }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof confirmSignUpSchema>>({
    resolver: zodResolver(confirmSignUpSchema),
    defaultValues: {
      confirmationCode: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof confirmSignUpSchema>) => {
      setIsLoading(true);
      setError(null);
      try {
          await onConfirm(values);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
          setError(err.message || "Ocorreu um erro.");
      } finally {
        setIsLoading(false);
      }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 rounded-lg  p-8 text-white mt-8">
      <h2 className="text-2xl font-bold text-center text-[#f5b719]">Verifique o seu E-mail</h2>
      <p className="text-center text-sm text-gray-300">Enviámos um código de confirmação para: <span className="font-bold">{email}</span></p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="confirmationCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de Confirmação</FormLabel>
                <FormControl>
                  <Input placeholder="123456" {...field} className="bg-[#0B2A6B] border-gray-600" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full bg-[#0126fb] hover:bg-[#0126fb]/80" disabled={isLoading}>
              {isLoading ? 'Confirmando...' : 'Confirmar Conta'}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ConfirmSignUpStep;