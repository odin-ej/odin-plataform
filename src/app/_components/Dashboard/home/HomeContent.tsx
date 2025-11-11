/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Award, Clock, Loader2, MousePointerClick } from "lucide-react";
import CustomCard from "../../Global/Custom/CustomCard";
import CustomCarousel, { SlideData } from "../../Global/Custom/CustomCarousel";
import CustomCalendarOAuth from "../../Global/Calendar/CalendarOAuth";
import { useMemo, useState } from "react";
import { checkUserPermission, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CombinedUser, useAuth } from "@/lib/auth/AuthProvider";
import { formatReaisResumo } from "../metas-casinha/GoalCard";
import UsefulLinksSection from "./UsefulLinksSection";
import axios from "axios";
import { HomeContentData } from "@/app/(dashboard)/page";
import { useQuery } from "@tanstack/react-query";
import {
  AreaRoles,
  LinkAreas,
  LinkPoster,
  LinkPosterArea,
} from "@prisma/client";
import ExMemberHomeContent from "./ExMemberHomeContent";
import LinkPosterCarousel from "../../Global/LinkPosterCarousel";
import { DIRECTORS_ONLY, TATICOS_ONLY } from "@/lib/permissions";
import NotificationPanel from "../../Global/NotificationPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const HomeContent = ({ initialData }: { initialData: HomeContentData }) => {
  const [view, setView] = useState<"personal" | "odin">("odin");
  const [viewMode, setViewMode] = useState<"member" | "exMember">("member");
  const { user } = useAuth();

  const fetchHomeData = async (): Promise<HomeContentData> => {
    // Use o 'user' do useAuth() diretamente
    if (!user || user.isExMember) {
      // Se não houver user ou for ex-membro, não deve buscar
      // Isso já é tratado pelo 'enabled' do useQuery, mas é bom ter uma validação aqui
      throw new Error(
        "Usuário não autenticado ou não elegível para buscar dados."
      );
    }

    const [
      strategyRes,
      myPointsRes,
      myTasksRes,
      usefulLinksRes,
      globalLinksRes,
      linkPostersRes,
    ] = await Promise.all([
      axios.get(`${API_URL}/api/house-goals`),
      // Use user.id diretamente
      axios.get(`${API_URL}/api/my-points/${user.id}`),
      // Para my-tasks, axios precisa estar configurado para enviar cookies/headers de autenticação
      axios.get(`${API_URL}/api/my-tasks`),
      // Use user.id diretamente
      axios.get(`${API_URL}/api/users/${user.id}/useful-links`),
      axios.get(`${API_URL}/api/useful-links`),
      axios.get(`${API_URL}/api/link-posters`),
    ]);

    const goals = strategyRes.data?.flatMap((obj: any) => obj.goals) || [];
    const myPoints = myPointsRes.data?.myPoints?.totalPoints ?? 0;
    const numberOfTasks = myTasksRes.data?.length || 0;
    const usefulLinks = usefulLinksRes.data?.links || [];
    const globalLinks = globalLinksRes.data?.links || [];
    const linkPosters =
      linkPostersRes.data.filter((poster: LinkPoster) => poster.isActive) || [];

    return {
      goals,
      myPoints,
      numberOfTasks,
      usefulLinks,
      globalLinks,
      linkPosters,
    };
  };

  const { data, isLoading } = useQuery({
    queryKey: ["homeDashboardData"],
    queryFn: fetchHomeData,
    initialData: initialData,
    enabled: !!user,
  });

  const { goals, myPoints, numberOfTasks, usefulLinks, globalLinks } =
    data || initialData;

  const slidesData: SlideData[] = goals.map((goal) => ({
    progress: Math.floor(Number(Number(goal.value) / Number(goal.goal)) * 100),
    valueText: `${goal.value} de ${goal.goal}`,
    mainText:
      String(goal.goal).split(" ")[0].length > 5
        ? formatReaisResumo(
            Number(String(goal.value).split(" ")[0]),
            Number(
              String(goal.goal).split(" ")[
                String(goal.goal).split(" ").length - 1
              ]
            )
          )
        : `${goal.value} de ${goal.goal}`,
    subtitle: goal.title,
    date: new Date().toLocaleDateString("pt-BR"),
  }));

  const isConsultant = useMemo(
    () =>
      user
        ? checkUserPermission(user as CombinedUser, {
            allowedAreas: [AreaRoles.CONSULTORIA],
          })
        : false, // If user is null, then permission is false
    [user]
  );
  const getSpecificLinks = () => {
    // Se não houver usuário ou cargo definido, não mostre links específicos.
    if (!user?.currentRole) {
      // Retorna apenas os links GERAIS para usuários sem cargo definido (caso de segurança)
      // CORREÇÃO: Usa o enum LinkAreas.GERAL em vez da string 'GERAL'
      return globalLinks.filter((link) => link.area === LinkAreas.GERAL);
    }

    const userRoleAreas = user.currentRole.area;

    return globalLinks.filter((link) => {
      // Regra 1: Link da área GERAL é sempre visível.
      // CORREÇÃO: Usa o enum LinkAreas.GERAL
      if (link.area === LinkAreas.GERAL) {
        return true;
      }

      // Regra 2: Você sempre vê os links que você mesmo criou.
      if (link.userId === user.id) {
        return true;
      }
      // Regra 5: Todos podem ver links que pertencem diretamente às suas áreas.
      // A tipagem 'as AreaRoles' é necessária aqui porque estamos comparando
      // um valor de `LinkAreas` com um array de `AreaRoles`.
      // Isso funciona desde que os nomes das áreas correspondentes sejam iguais nos dois enums.
      if (userRoleAreas.includes(link.area as AreaRoles)) {
        return true;
      }

      // Se nenhuma das regras acima for atendida, o link não é visível.
      return false;
    });
  };

  const specificLinks = getSpecificLinks();

  const { memberLinkPosters, exMemberLinkPosters } = useMemo(() => {
    const memberLinkPostersAllRoles = data.linkPosters.filter((poster) =>
      poster.areas.every(
        (area) =>
          area !== LinkPosterArea.EXMEMBROS && area !== LinkPosterArea.YGGDRASIL
      )
    );

    const exMemberLinkPosters = data.linkPosters.filter((poster) =>
      poster.areas.every(
        (area) =>
          area !== LinkPosterArea.MEMBROS &&
          area !== LinkPosterArea.YGGDRASIL &&
          area !== LinkPosterArea.CONSULTORIA &&
          area !== LinkPosterArea.TATICO &&
          area !== LinkPosterArea.DIRETORIA
      )
    );

    const isDirector = checkUserPermission(user, DIRECTORS_ONLY);

    const isTatico = checkUserPermission(user, TATICOS_ONLY);

    if (isDirector) {
      return {
        memberLinkPosters: memberLinkPostersAllRoles,
        exMemberLinkPosters: exMemberLinkPosters,
      };
    }
    const finalPosters = memberLinkPostersAllRoles.filter((poster) => {
      // Regra 1: Todos veem os posters da área "GERAL"
      if (poster.areas.includes(LinkPosterArea.GERAL)) {
        return true;
      }
      // Regra 2: Todos veem os posters da área "HOME"
      if (poster.areas.includes(LinkPosterArea.HOME)) {
        return true;
      }
      // Regra 3: Utilizadores do Tático veem os posters da área "TATICO"
      if (isTatico && poster.areas.includes(LinkPosterArea.TATICO)) {
        return true;
      }
      // Regra 4: Consultores veem os posters da área "CONSULTORIA"
      if (isConsultant && poster.areas.includes(LinkPosterArea.CONSULTORIA)) {
        return true;
      }

      // Se nenhuma regra for cumprida, o poster é escondido.
      return false;
    });

    return { memberLinkPosters: finalPosters, exMemberLinkPosters };
  }, [data.linkPosters, user, isConsultant]);

  const isDirector = useMemo(
    () => (user ? checkUserPermission(user, DIRECTORS_ONLY) : false),
    [user]
  );
  if (isLoading)
    return (
      <div className="flex justify-center items-center mt-20">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );

  return (
    <>
      {isDirector ? (
        <>
          <div>
            <Button
              className="mb-4 bg-[#0126fb] hover:bg-[#0126fb]/50 text-white flex items-center gap-2"
              onClick={() =>
                setViewMode(viewMode === "member" ? "exMember" : "member")
              }
            >
              <MousePointerClick />
              Modo: {viewMode === "member" ? "Membro" : "Ex-Membro"}
            </Button>
          </div>

          {viewMode === "member" ? (
            <>
             <div className='w-full'>
              <NotificationPanel />
            </div>
              <div className="w-full min-h-[200px] mt-6">
                <LinkPosterCarousel slides={memberLinkPosters} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <CustomCard
                  type="link"
                  title="Minhas Pendências"
                  value={numberOfTasks}
                  icon={Clock}
                  href="/minhas-pendencias"
                />
                <CustomCard
                  type="link"
                  title="Meus Pontos"
                  value={myPoints}
                  icon={Award}
                  href="/meus-pontos"
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <UsefulLinksSection
                  links={specificLinks}
                  isGlobal={true}
                  isConsultant={isConsultant}
                />

                <UsefulLinksSection links={usefulLinks} isGlobal={false} />
              </div>

              <div className="grid grid-cols-1 w-full mt-8">
                <CustomCarousel title="Metas da Casinha" slides={slidesData} />
                <div className="hidden min-[375px]:flex w-full mt-8 gap-2 sm:gap-4 p-1 bg-[#00205e] rounded-lg">
                  <Button
                    onClick={() => setView("odin")}
                    className={cn(
                      "px-3 sm:px-4 py-2 rounded-md font-semibold text-sm transition-colors",
                      view === "odin"
                        ? "bg-[#0126fb] text-white"
                        : "bg-transparent text-gray-400 hover:bg-white/5"
                    )}
                  >
                    Agenda EJ
                  </Button>
                  <Button
                    onClick={() => setView("personal")}
                    className={cn(
                      "px-3 sm:px-4 py-2 rounded-md font-semibold text-sm transition-colors",
                      view === "personal"
                        ? "bg-[#0126fb] text-white"
                        : "bg-transparent text-gray-400 hover:bg-white/5"
                    )}
                  >
                    Minha Agenda
                  </Button>
                </div>

                {view === "odin" && (
                  <CustomCalendarOAuth
                    clientId={
                      process.env
                        .NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID as string
                    }
                    calendarId={
                      process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID as string
                    }
                  />
                )}

                {view === "personal" && (
                  <CustomCalendarOAuth
                    clientId={
                      process.env
                        .NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID as string
                    }
                    calendarId="primary"
                  />
                )}
              </div>
            </>
          ) : (
            <ExMemberHomeContent linkPosters={exMemberLinkPosters} />
          )}
        </>
      ) : (
        <>
          {!user?.isExMember ? (
            <>
            <div className='w-full'>
              <NotificationPanel />
            </div>

              <div className="w-full mt-6">
                <LinkPosterCarousel slides={memberLinkPosters} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <CustomCard
                  type="link"
                  title="Minhas Pendências"
                  value={numberOfTasks}
                  icon={Clock}
                  href="/minhas-pendencias"
                />
                <CustomCard
                  type="link"
                  title="Meus Pontos"
                  value={myPoints}
                  icon={Award}
                  href="/meus-pontos"
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <UsefulLinksSection
                  links={specificLinks}
                  isGlobal={true}
                  isConsultant={isConsultant}
                />

                <UsefulLinksSection links={usefulLinks} isGlobal={false} />
              </div>

              <div className="grid grid-cols-1 w-full mt-8">
                <CustomCarousel title="Metas da Casinha" slides={slidesData} />
                <div className="hidden min-[375px]:flex w-full mt-8 gap-2 sm:gap-4 p-1 bg-[#00205e] rounded-lg">
                  <Button
                    onClick={() => setView("odin")}
                    className={cn(
                      "px-3 sm:px-4 py-2 rounded-md font-semibold text-sm transition-colors",
                      view === "odin"
                        ? "bg-[#0126fb] text-white"
                        : "bg-transparent text-gray-400 hover:bg-white/5"
                    )}
                  >
                    Agenda EJ
                  </Button>
                  <Button
                    onClick={() => setView("personal")}
                    className={cn(
                      "px-3 sm:px-4 py-2 rounded-md font-semibold text-sm transition-colors",
                      view === "personal"
                        ? "bg-[#0126fb] text-white"
                        : "bg-transparent text-gray-400 hover:bg-white/5"
                    )}
                  >
                    Minha Agenda
                  </Button>
                </div>

                {view === "odin" && (
                  <CustomCalendarOAuth
                    clientId={
                      process.env
                        .NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID as string
                    }
                    calendarId={
                      process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID as string
                    }
                  />
                )}

                {view === "personal" && (
                  <CustomCalendarOAuth
                    clientId={
                      process.env
                        .NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID as string
                    }
                    calendarId="primary"
                  />
                )}
              </div>
            </>
          ) : (
            <ExMemberHomeContent linkPosters={exMemberLinkPosters} />
          )}
        </>
      )}
    </>
  );
};

export default HomeContent;
