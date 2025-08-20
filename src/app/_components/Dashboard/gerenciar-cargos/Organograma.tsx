import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import RoleMemberCard, { areaConfig, isConfigurableArea } from "./RoleMemberCard";
import { useMemo, useState } from "react";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import { AreaRoles } from "@prisma/client";
import { cn } from "@/lib/utils";

interface OrganogramaContent{
   users: MemberWithFullRoles[];
   areas: AreaRoles[];
   isManagment: boolean
   onClick?: (user: MemberWithFullRoles) => void;
}

const Organograma = ({users, areas, isManagment, onClick}: OrganogramaContent) => {
  const [selectedArea, setSelectedArea] = useState<AreaRoles | "TODOS">(
    "TODOS"
  );
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (selectedArea === "TODOS") {
      return users.filter((user) => user.currentRole && !user.isExMember); // Mostra todos com cargo definido
    }
    return users.filter((user) =>
      user.currentRole?.area.includes(selectedArea)
    );
  }, [users, selectedArea]);

  return (
    <div className="p-4 sm:p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Organograma da Empresa
        </h1>
        <p className="mt-2 text-lg text-[#f5b719]">
          Navegue pelos cargos e conheça quem faz parte de cada área.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
        <Button
          onClick={() => setSelectedArea("TODOS")}
          variant={selectedArea === "TODOS" ? "default" : "outline"}
          className={cn(
            "border-blue-800 text-white transition-all ",
            selectedArea === "TODOS"
              ? "bg-[#f5b719] hover:!text-white hover:bg-[#f5b719]/90"
              : "bg-[0126fb]/30 hover:!text-white hover:bg-[0126fb]/60"
          )}
        >
          Todos
        </Button>
        {areas.map((area) => {
          if (!isConfigurableArea(area)) return null;
          const config = areaConfig[area];
          return (
            <Button
              key={area}
              onClick={() => setSelectedArea(area)}
              variant={selectedArea === area ? "default" : "outline"}
              className={cn(
                "border-blue-800 text-white transition-all",
                selectedArea === area
                  ? `${config.color} hover:${config.color}/90 text-white`
                  : `${config.color}/30 hover:${config.color}/60 hover:text-white/90`
              )}
            >
              <config.icon className="w-4 h-4 mr-2" />
              {config.label}
            </Button>
          );
        })}
      </div>

      {filteredUsers.length > 0 ? (
        <Carousel
          opts={{ align: "start", loop: true }}
          className="w-full mx-auto"
        >
          <CarouselContent className="-ml-4">
            {filteredUsers.map((user) => (
              <CarouselItem
                key={user.id}
                className="pl-4 basis-full sm:basis-1/2 md:basis-1/2 lg:basis-1/3 xl:basis-1/4 flex"
              >
                <div className="p-1 flex-1">
                  <RoleMemberCard onClick={onClick} isManagment={isManagment} user={user} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="text-white bg-blue-900/50 border-blue-800 hover:bg-blue-900/80" />
          <CarouselNext className="text-white bg-blue-900/50 border-blue-800 hover:bg-blue-900/80" />
        </Carousel>
      ) : (
        <div className="text-center py-16 px-6 bg-[#010d26]/50 rounded-lg">
          <h3 className="text-xl font-semibold text-white">
            Nenhum membro encontrado
          </h3>
          <p className="mt-2 text-gray-400">
            Não há membros com cargo definido nesta área.
          </p>
        </div>
      )}
    </div>
  );
};

export default Organograma;
