"use client";
import { Award, Clock } from "lucide-react";
import CustomCard from "../Global/Custom/CustomCard";
import CustomCarousel, { SlideData } from "../Global/Custom/CustomCarousel";
import CustomCalendarOAuth from "../Global/Calendar/CalendarOAuth";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Goal, UsefulLink } from ".prisma/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import Image from "next/image";
import { formatReaisResumo } from "./GoalCard";
import UsefulLinksSection from "./UsefulLinksSection";

interface HomeContentProps {
  myPoints: number;
  numberOfTasks: number;
  goals: Goal[];
  usefulLinks: UsefulLink[];
}

const HomeContent = ({ goals, myPoints, numberOfTasks, usefulLinks }: HomeContentProps) => {
  const [view, setView] = useState<"personal" | "odin">("odin");
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

  const { user } = useAuth();
  return (
    <>
      {!user?.isExMember ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CustomCard
              type="link"
              title="Minhas pendências"
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

        <UsefulLinksSection links={usefulLinks} />

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
                  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID as string
                }
                calendarId={
                  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID as string
                }
              />
            )}

            {view === "personal" && (
              <CustomCalendarOAuth
                clientId={
                  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID as string
                }
                calendarId="primary"
              />
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full items-center gap-12">
          {/* Coluna de Texto */}
          <div className="text-center lg:text-left">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight">
              Olá,{" "}
              <span className="text-[#f5b719] italic">
                {user!.name.split(" ")[0]}
              </span>
              !
            </h2>
            <h3 className="mt-4 text-xl md:text-2xl font-medium text-white/80">
              Bem-vindo(a) à plataforma da Casinha dos Sonhos.
            </h3>
            <p className="mt-2 text-base md:text-lg text-white/60 max-w-prose mx-auto lg:mx-0">
              Aqui você poderá se conectar com membros e se manter por dentro da
              cultura da empresa.
            </p>
            <p className="mt-2 text-base md:text-lg text-white/60 max-w-prose mx-auto lg:mx-0">
              Sinta-se a vontade para explorar suas funcionalidades especiais.
            </p>
          </div>

          {/* Coluna da Imagem */}
          <div className="relative w-full max-w-md mx-auto aspect-square">
            <Image
              src="/casinha.png"
              alt="Ilustração da Casinha dos Sonhos"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 80vw, (max-width: 1024px) 50vw, 400px"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
};

export default HomeContent;
