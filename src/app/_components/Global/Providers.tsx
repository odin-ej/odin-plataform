"use client";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: "#010d26",
              color: "#ffffff",
              border: "1px solid #0126fb",
            },
            className: "class",
            classNames: {
              // Estilos para os diferentes tipos de toast
              toast:
                "bg-[#010d26] text-white border-2 border-[#00205e]/30 shadow-lg",
              title: "!text-[#f5b719] font-bold",
              description: "!text-gray-300",

              // Cores dos ícones quando `richColors` está ativo
              success: "!text-green-500",
              error: "!text-red-500",
              warning: "!text-[#f5b719]",
              info: "!text-blue-500",

              // Estilo do botão de fechar
              closeButton:
                "bg-transparent border-0 text-white hover:bg-white/10",

              // Estilo dos botões de ação dentro do toast
              actionButton:
                "bg-[#f5b719] text-[#010d26] font-bold hover:bg-[#f5b719]/90",
              cancelButton: "bg-gray-700 text-white hover:bg-gray-600",
            },
          }}
        />
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default Providers;
