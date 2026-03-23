"use client"; // Este componente precisa ser de cliente para ter animações no hover

import Image from "next/image";
import { LayoutDashboard, MessageSquare, Users, Sparkles, Navigation } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

const CommunityContent = () => {
  const { user } = useAuth();
  const name = user?.name.split(' ')[0] || '';

  // Lista de funcionalidades para exibir nos cards
  const features = [
    {
      icon: LayoutDashboard,
      title: "Navegue pelo Feed",
      description: "Fique por dentro das últimas postagens e novidades."
    },
    {
      icon: MessageSquare,
      title: "Participe dos Canais",
      description: "Entre em debates e discussões nos canais da sua área."
    },
    {
      icon: Users,
      title: "Conecte-se com Membros",
      description: "Encontre e inicie conversas com sócios e ex-membros."
    },
    {
      icon: Sparkles,
      title: "Descubra Novidades",
      description: "Explore destaques, avisos importantes e muito mais."
    }
  ];

  return (
    <>
      <style jsx global>{`
        /* Animações sutis para a entrada dos elementos */
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>

      <div className="flex flex-col items-center justify-center h-full w-full p-4 sm:p-8 text-white overflow-y-auto">
        <div className="text-center w-full max-w-4xl mx-auto">
          {/* Logo com animação */}
          <div 
            className="mx-auto animate-fade-in-down" 
            style={{ animationDelay: '0.1s', opacity: 0 }}
          >
            <Image src="/logo-amarela.png" alt="Logo" width={96} height={96} priority />
          </div>

          {/* Mensagem de Boas-Vindas */}
          <h1 
            className="mt-6 text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 animate-fade-in-down"
            style={{ animationDelay: '0.3s', opacity: 0 }}
          >
            Olá, <span className="text-[#f5b719] drop-shadow-[0_0_8px_#f5b719]">{name}!</span>
          </h1>
          <p 
            className="mt-3 text-lg text-gray-400 animate-fade-in-down"
            style={{ animationDelay: '0.5s', opacity: 0 }}
          >
            Bem-vindo(a) à comunidade da Casinha dos Sonhos. Aqui começa sua jornada.
          </p>

          {/* Grid de Funcionalidades */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-[#00205e]/30 border border-gray-800 rounded-xl p-6 text-left hover:border-[#f5b719]/50 hover:bg-[#00205e]/60 transition-all duration-300 transform hover:-translate-y-1 group animate-fade-in-down"
                style={{ animationDelay: `${0.7 + index * 0.2}s`, opacity: 0 }}
              >
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-[#0126fb] to-[#0c1a4b] mb-4 group-hover:from-[#f5b719] group-hover:to-[#0126fb] transition-colors duration-300">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Mensagem de Navegação */}
          <div 
            className="mt-12 text-gray-500 animate-fade-in-down flex items-center justify-center gap-2"
            style={{ animationDelay: '1.5s', opacity: 0 }}
          >
             <Navigation size={16} />
             <p className='hidden lg:block'>Utilize o menu lateral para navegar pela comunidade.</p>
             <p className='lg:hidden'>Utilize o menu abaixo para navegar pela comunidade.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommunityContent;