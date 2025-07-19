import { useEffect, useMemo, useState } from "react";
import DivisionSidebar from "./DivisionSidebar";
import { SidebarContent, SidebarSeparator } from "@/components/ui/sidebar";
import { generalLinks, personalLinks, restrictedLinks } from "@/lib/links";
import { usePathname } from "next/navigation";
import { checkUserPermission } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";

const LinksSidebar = () => {
  const pathname = usePathname();
  const [activeLink, setActiveLink] = useState(pathname);
  const { user } = useAuth();

  useEffect(() => {
    setActiveLink(pathname);
  }, [pathname]);

  const filteredGeneralLinks = useMemo(() => {
    if (!user) return [];
    return generalLinks.filter((link) => {
      // Se o link não pode ser acessado por ex-membros e o usuário é um, esconde o link.
      if (link.exMemberCanAccess === false && user.isExMember) {
        return false;
      }
      return true;
    });
  }, [user]);

  const filteredPersonalLinks = useMemo(() => {
    if (!user) return [];
    return personalLinks.filter((link) => {
      if (link.exMemberCanAccess === false && user.isExMember) {
        return false;
      }
      return true;
    });
  }, [user]);

  const filteredRestrictedLinks = useMemo(() => {
    if (!user) return [];
    return restrictedLinks.filter((link) =>
      checkUserPermission(user, {
        allowedRoles: link.roles.map((r) => r.name), // Extrai os nomes dos cargos
        allowedAreas: link.areas,
        // Garante que a regra 'exMemberCanAccess' do link seja respeitada
        allowExMembers: link.exMemberCanAccess === true,
      })
    );
  }, [user]);

  return (
    <SidebarContent className="bg-[#010d26] scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-transparent">
      <DivisionSidebar
        label="Geral"
        activeLink={activeLink}
        array={filteredGeneralLinks}
        setActiveLink={setActiveLink}
      />

      <SidebarSeparator className="px-4 mx-0" />

      {/* Renderiza a seção de acesso restrito apenas se houver links permitidos */}
      {filteredRestrictedLinks.length > 0 && (
        <>
          <DivisionSidebar
            label="Acesso Restrito"
            activeLink={activeLink}
            array={filteredRestrictedLinks}
            setActiveLink={setActiveLink}
          />
          <SidebarSeparator className="px-4 mx-0" />
        </>
      )}

      <DivisionSidebar
        label="Pessoal"
        activeLink={activeLink}
        array={filteredPersonalLinks}
        setActiveLink={setActiveLink}
      />
    </SidebarContent>
  );
};

export default LinksSidebar;
