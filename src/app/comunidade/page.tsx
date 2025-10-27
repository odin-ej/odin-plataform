"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import Cookies from "js-cookie";
import WelcomeComponent from "@/app/_components/Dashboard/comunidade/WelcomeComponent";
import { Loader2 } from "lucide-react";
import CommunityContent from "@/app/_components/Dashboard/comunidade/CommunityContent";

export const dynamic = "force-dynamic";

const CommunityPage = () => {
  const { user } = useAuth();
  // Começa em 'loading' para evitar um flash da tela errada
  const [view, setView] = useState<'loading' | 'welcome' | 'community'>('loading');

  useEffect(() => {
    // Verifica o cookie assim que o componente é montado no cliente
    const hasEntered = Cookies.get("community_entered");
    if (hasEntered) {
      setView('community');
    } else {
      setView('welcome');
    }
  }, []);

  if (view === 'loading' || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );
  }

  if (view === 'welcome') {
    // Passa a função que atualiza a view para o componente de boas-vindas
    return <WelcomeComponent onEnter={() => setView('community')} />;
  }
  
  // Se o cookie existir, renderiza o conteúdo principal da comunidade
  return <CommunityContent />;
};

export default CommunityPage;