"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import SearchCommand, { CommandGroupData } from "./Custom/SearchCommand";

import { generalLinks, personalLinks, restrictedLinks } from "@/lib/links";
import { checkUserPermission } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
const Header = () => {
  const router = useRouter();
  const { user } = useAuth(); // Obtém o usuário do seu contexto de autenticação

  // Hook useMemo para calcular os links pesquisáveis com base nas permissões do usuário.
  // Isso garante que a filtragem só seja executada quando o usuário mudar.
  const searchGroups = useMemo<CommandGroupData[]>(() => {
    if (!user) {
      // Se não houver usuário, retorna um array vazio para não mostrar nada na busca
      return [];
    }

    // 1. Filtra os links gerais
    const filteredGeneralLinks = generalLinks.filter((link) => {
      if (link.exMemberCanAccess === false && user.isExMember) {
        return false;
      }
      return true;
    });

    // 2. Filtra os links pessoais
    const filteredPersonalLinks = personalLinks.filter((link) => {
      if (link.exMemberCanAccess === false && user.isExMember) {
        return false;
      }
      return true;
    });

    // 3. Filtra os links restritos
    const filteredRestrictedLinks = restrictedLinks.filter((link) =>
      checkUserPermission(user, {
        allowedRoles: link.roles.map((r) => r.name),
        allowedAreas: link.areas,
        allowExMembers: link.exMemberCanAccess === true,
      })
    );

    // 4. Combina todos os links permitidos em um único array
    const allAllowedLinks = [
      ...filteredGeneralLinks,
      ...filteredPersonalLinks,
      ...filteredRestrictedLinks,
    ];

    return [
      {
        heading: "Páginas",
        items: allAllowedLinks.map((link) => ({
          label: link.name,
          icon: link.icon,
          action: () => router.push(link.href),
        })),
      },
    ];
  }, [user, router]);

  return (
    <header className="flex items-center justify-between px-4 bg-[#010d26] h-16 border-b-2 border-[#0126fb]">
      <SearchCommand
        groups={searchGroups}
        placeholder="Pesquisar páginas..."
        triggerLabel="Para onde você quer ir?"
      />
      <Image
        src="/Logo.png"
        alt="Logo da Casinha"
        width={100}
        height={50}
        className="cursor-pointer"
        onClick={() => router.push("/")}
      />
    </header>
  );
};

export default Header;
