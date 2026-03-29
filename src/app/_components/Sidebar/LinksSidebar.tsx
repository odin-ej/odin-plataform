import { useEffect, useMemo, useState } from "react";
import DivisionSidebar from "./DivisionSidebar";
import { SidebarContent, SidebarSeparator } from "@/components/ui/sidebar";
import { generalLinks, personalLinks, restrictedLinks } from "@/lib/links";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAllowedActions } from "@/lib/auth/AllowedActionsProvider";
import { AppAction } from "@/lib/permissions";
import { AreaRoles } from "@prisma/client";

const LinksSidebar = () => {
  const pathname = usePathname();
  const [activeLink, setActiveLink] = useState(pathname);
  const { user } = useAuth();
  const { canDo } = useAllowedActions();

  useEffect(() => {
    setActiveLink(pathname);
  }, [pathname]);

  const isTrainee = useMemo(() => {
    if (!user?.currentRole) return false;
    return user.currentRole.area.includes(AreaRoles.TRAINEE);
  }, [user]);

  const filteredGeneralLinks = useMemo(() => {
    if (!user) return [];
    if (isTrainee) return [];
    return generalLinks;
  }, [user, isTrainee]);

  const filteredPersonalLinks = useMemo(() => {
    if (!user) return [];
    if (isTrainee) {
      return personalLinks.filter(
        (link) => link.name === "Minhas Notas" || link.name === "Meu Perfil"
      );
    }
    return personalLinks;
  }, [user, isTrainee]);

  const filteredRestrictedLinks = useMemo(() => {
    if (!user) return [];
    if (isTrainee) return [];
    return restrictedLinks.filter((link) =>
      link.requiredAction ? canDo(link.requiredAction) : canDo(AppAction.MANAGE_USERS)
    );
  }, [user, isTrainee, canDo]);

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
