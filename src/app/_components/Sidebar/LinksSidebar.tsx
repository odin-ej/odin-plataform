/**
 * LinksSidebar
 *
 * Renderiza o menu lateral filtrando os links por permissao.
 *
 * Antes: bloqueio hardcoded para trainees (so viam "Minhas Notas" e
 * "Meu Perfil"), e secoes "Geral" / "Areas" / "Acesso Restrito"
 * vetadas para eles em codigo.
 *
 * Agora: usa `canAccess(href)` do `AllowedActionsProvider`, que olha
 * a tabela `RoutePermission` no banco. Quem ve cada link e decidido
 * pelo admin em `/gerenciar-permissoes` — incluindo trainees, que
 * podem ser liberados ou bloqueados rota a rota via policy.
 *
 * Para "Acesso Restrito", continua sendo necessario o `requiredAction`
 * (controlado por `ActionPermission` + `canDo`), pois sao paginas que
 * gateiam por *acao* alem da rota em si.
 */
import { useEffect, useMemo, useState } from "react";
import DivisionSidebar from "./DivisionSidebar";
import { SidebarContent, SidebarSeparator } from "@/components/ui/sidebar";
import {
  areaLinks,
  generalLinks,
  personalLinks,
  restrictedLinks,
} from "@/lib/links";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAllowedActions } from "@/lib/auth/AllowedActionsProvider";
import { AppAction } from "@/lib/permissions";

const LinksSidebar = () => {
  const pathname = usePathname();
  const [activeLink, setActiveLink] = useState(pathname);
  const { user } = useAuth();
  const { canDo, canAccess } = useAllowedActions();

  useEffect(() => {
    setActiveLink(pathname);
  }, [pathname]);

  // Geral / Pessoal / Areas: filtrados puramente por `canAccess` (banco).
  // Quem decide se trainees veem cada item e a policy da rota.
  const filteredGeneralLinks = useMemo(() => {
    if (!user) return [];
    return generalLinks.filter((link) => canAccess(link.href));
  }, [user, canAccess]);

  const filteredPersonalLinks = useMemo(() => {
    if (!user) return [];
    return personalLinks.filter((link) => canAccess(link.href));
  }, [user, canAccess]);

  const filteredAreaLinks = useMemo(() => {
    if (!user) return [];
    // Areas exigem `requiredAction` (action policy) + acesso a rota.
    return areaLinks.filter(
      (link) => canDo(link.requiredAction) && canAccess(link.href)
    );
  }, [user, canDo, canAccess]);

  // Acesso Restrito: continua usando `requiredAction` como gating principal,
  // pois essas paginas sao governadas por uma acao especifica.
  const filteredRestrictedLinks = useMemo(() => {
    if (!user) return [];
    return restrictedLinks.filter((link) =>
      link.requiredAction
        ? canDo(link.requiredAction)
        : canDo(AppAction.MANAGE_USERS)
    );
  }, [user, canDo]);

  return (
    <SidebarContent className="bg-[#010d26] scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-transparent">
      {filteredGeneralLinks.length > 0 && (
        <>
          <DivisionSidebar
            label="Geral"
            activeLink={activeLink}
            array={filteredGeneralLinks}
            setActiveLink={setActiveLink}
          />
          <SidebarSeparator className="px-4 mx-0" />
        </>
      )}

      {filteredAreaLinks.length > 0 && (
        <>
          <DivisionSidebar
            label="Áreas"
            activeLink={activeLink}
            array={filteredAreaLinks}
            setActiveLink={setActiveLink}
          />
          <SidebarSeparator className="px-4 mx-0" />
        </>
      )}

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

      {filteredPersonalLinks.length > 0 && (
        <DivisionSidebar
          label="Pessoal"
          activeLink={activeLink}
          array={filteredPersonalLinks}
          setActiveLink={setActiveLink}
        />
      )}
    </SidebarContent>
  );
};

export default LinksSidebar;
