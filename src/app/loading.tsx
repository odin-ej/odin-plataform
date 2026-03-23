'use client'
import Image from "next/image";

const Loading = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#010d26] fixed inset-0 z-[9999]">
      {/* Container para centralizar o spinner e o texto */}
      <div className="flex flex-col items-center justify-center gap-4">
        {/* Spinner externo com Tailwind CSS */}
        <div className="relative h-16 w-16 mb-4">
          {/* Spinner externo com Tailwind CSS, agora posicionado absolutamente */}
          <div className="absolute inset-0 animate-spin rounded-full border-t-4 border-b-4 border-[#f5b719]"></div>
          {/* Imagem dentro do spinner, mas sem rotação. Posicionada absolutamente e centralizada. */}
          <Image
            src="/logo-amarela.png" // URL de imagem de exemplo (substitua pelo seu logo)
            alt="Logo da Empresa"
            height={40}
            width={40}
            className="absolute inset-0 m-auto w-10 h-10 rounded-full" // Centraliza a imagem sem rotação
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/40x40/f5b719/00205e?text=LOGO'; }} // Fallback para a imagem
          />
        </div>
        <p className="text-[#f5b719] text-lg font-semibold">
          Só mais um pouquinho, sócio(a)! 
        </p>
      </div>
    </div>
  );
};

export default Loading;
