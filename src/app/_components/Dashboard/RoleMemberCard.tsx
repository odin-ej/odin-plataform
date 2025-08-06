"use client";

import { AreaRoles, Role, User } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  Building,
  Briefcase,
  Crown,
  Target,
  Cog,
  Gavel,
  CircleDollarSign,
  UsersRound,
  UserCog,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserWithRole extends User {
  currentRole: Role | null;
}

export const areaConfig: Record<
  Exclude<AreaRoles, "OUTRO">,
  { icon: React.ElementType; color: string; label: string }
> = {
  [AreaRoles.DIRETORIA]: {
    icon: Crown,
    color: "bg-amber-500",
    label: "Diretoria",
  },
  [AreaRoles.PRESIDENCIA]: {
    icon: Building,
    color: "bg-blue-500",
    label: "Presidência",
  },
  [AreaRoles.TATICO]: { icon: Target, color: "bg-purple-500", label: "Tático" },
  [AreaRoles.CONSULTORIA]: {
    icon: UsersRound,
    color: "bg-indigo-500",
    label: "Consultoria",
  },
  [AreaRoles.OPERACOES]: {
    icon: Cog,
    color: "bg-yellow-500",
    label: "Operações",
  },
  [AreaRoles.MERCADO]: {
    icon: CircleDollarSign,
    color: "bg-green-500",
    label: "Mercado",
  },
  [AreaRoles.PROJETOS]: {
    icon: Briefcase,
    color: "bg-red-500",
    label: "Projetos",
  },
  [AreaRoles.PESSOAS]: {
    icon: UserCog,
    color: "bg-pink-500",
    label: "Gestão de Pessoas",
  },
  [AreaRoles.CONSELHO]: { icon: Gavel, color: "bg-sky-500", label: "Conselho" },
};

export function isConfigurableArea(
  area: AreaRoles
): area is Exclude<AreaRoles, "OUTRO"> {
  return area in areaConfig;
}

const RoleMemberCard = ({ user }: { user: UserWithRole }) => {
  const roleAreas = user.currentRole?.area || [];

  return (
    <Card className="bg-[#02102E] border-blue-900/50 text-white overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 flex flex-col h-full">
      <CardHeader className="p-0 text-center">
        {/* Fundo decorativo */}
        <div className="h-16 bg-gradient-to-r from-sky-900 to-blue-900" />

        {/* Container para a imagem e o texto, que é deslocado para cima como um bloco único */}
        <div className="px-4 pb-4 flex flex-col items-center justify-center mt-[-48px]">
          <Avatar className="h-20 w-20">
            <AvatarImage
              src={user.imageUrl}
              alt={user.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-[#0126fb] text-xs">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-lg font-bold text-gray-100 leading-tight line-clamp-2">
            {user.name}
          </CardTitle>
          <p className="text-sm text-[#f5b719] leading-tight line-clamp-2">
            {user.currentRole?.name || "Cargo não definido"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="text-center px-4 pt-0 flex-grow">
        {" "}
        {/* pt-0 remove o espaçamento extra */}
        <p className="text-xs text-gray-400 italic">
          {user.currentRole?.description || "Sem descrição para este cargo."}
        </p>
      </CardContent>
      <CardFooter className="flex justify-center items-center flex-wrap gap-2 p-4 mt-auto">
        {roleAreas.map((area) => {
          if (isConfigurableArea(area)) {
            const config = areaConfig[area];
            return (
              <Badge
                key={area}
                variant="secondary"
                className={cn("text-white border-none", config.color)}
              >
                <config.icon className="w-3 h-3 mr-1.5 flex-shrink-0" />
                {config.label}
              </Badge>
            );
          }
          return null;
        })}
      </CardFooter>
    </Card>
  );
};

export default RoleMemberCard;
