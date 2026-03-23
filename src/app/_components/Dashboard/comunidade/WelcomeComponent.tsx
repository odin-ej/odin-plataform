"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import React from "react";
import Image from "next/image";

interface WelcomeComponentProps {
  onEnter: () => void; // Função para notificar o pai que o usuário entrou
}

const WelcomeComponent = ({ onEnter }: WelcomeComponentProps) => {
  const { user } = useAuth();
  const router = useRouter();

  const handleEnterClick = () => {
    // Define o cookie para expirar em 3 dias
    Cookies.set("community_entered", "true", { expires: 3, path: "/" });
    onEnter();
  };

  const greeting = `Olá, ${user?.name.split(" ")[0]}!`;

  return (
    <>
      {/* Efeitos de Fundo e Animações */}
      <style jsx global>{`
        /* Animação do gradiente de fundo que se move lateralmente */
        @keyframes animate-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        /* NOVO: Animação do "túnel de luz" 3D que se expande e contrai */
        @keyframes animate-light-tunnel {
          0% { background-size: 100% 100%; }
          50% { background-size: 150% 150%; }
          100% { background-size: 100% 100%; }
        }
        @keyframes fade-in-letter {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .neon-yellow-text { filter: drop-shadow(0 0 5px #f5b719) drop-shadow(0 0 10px #f5b719); }
        .neon-yellow-box { box-shadow: 0 0 5px #f5b719, 0 0 15px #f5b719, inset 0 0 5px #f5b719; }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010d26] p-4 text-white overflow-hidden">
        {/* --- FUNDO 3D APRIMORADO --- */}
        {/* Camada 1: Gradiente animado base */}
        <div 
          className="absolute inset-0 opacity-80" 
          style={{ 
            background: 'linear-gradient(135deg, #010d26 0%, #00205e 50%, #0126fb 100%)',
            backgroundSize: '200% 200%',
            animation: 'animate-gradient 20s ease infinite',
          }}
        />
        {/* Camada 2: Efeito de luz 3D (Túnel de Luz) */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(1, 38, 251, 0.2) 0%, rgba(1, 13, 38, 0) 60%)',
            animation: 'animate-light-tunnel 10s ease-in-out infinite',
          }}
        />
        {/* Camada 3: Overlay preto para escurecer */}
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full">
          {/* Botão Voltar */}
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="absolute -top-16 left-0 flex items-center gap-2 text-gray-400 hover:bg-transparent  hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </Button>
          
          {/* Imagem Flutuante da "Casinha" */}
          <Image 
            src="/logo-amarela.png"
            width={96}
            height={96}
            alt="Casinha dos Sonhos" 
            className="w-24 h-24 mb-6 drop-shadow-lg" // drop-shadow adiciona profundidade
            style={{ animation: 'float 6s ease-in-out infinite' }}
            priority // Otimiza o carregamento da imagem principal
          />

          {/* Título com Efeito Lettering */}
          <h1 className="text-5xl md:text-7xl font-bold mb-4 neon-yellow-text tracking-wide">
            {greeting.split("").map((char, index) => (
              <span
                key={index}
                style={{ animation: `fade-in-letter 0.5s ease forwards ${index * 0.05}s`, opacity: 0 }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </h1>
          
          <p className="text-lg text-gray-300 mb-8 max-w-lg leading-relaxed">
            Comunique-se com membros e ex-membros, crie posts, canais de comunicação e divirta-se na comunidade da Casinha.
          </p>

          <Button
            onClick={handleEnterClick}
            size="lg"
            className="bg-[#f5b719] text-black hover:bg-[#f5b719]/90 font-bold text-lg px-10 py-6 rounded-lg transition-transform hover:scale-105 neon-yellow-box"
          >
            Entrar na Comunidade
          </Button>
        </div>
      </div>
    </>
  );
};

export default WelcomeComponent;