import { Role, AreaRoles } from ".prisma/client";
import {
  Award,
  CalendarClock,
  CircleUser,
  ClipboardList,
  Clock,
  Goal,
  HomeIcon,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  MessageSquare,
  TicketCheck,
  Users,
} from "lucide-react";
import { JrPointIconWhite } from "@/app/_components/Global/JrPointsIcon";

interface Links {
  name: string;
  href: string;
  icon: React.ElementType;
  exMemberCanAccess?: boolean;
}

interface RestrictedLinks extends Links {
  roles: Pick<Role, "name">[];
  areas?: AreaRoles[];
}

export const generalLinks: Links[] = [
  {
    name: "Início",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Chat IA",
    href: "/chat",
    icon: MessageSquare,
    exMemberCanAccess: false,
  },
  {
    name: "JR Points",
    href: "/jr-points",
    icon: JrPointIconWhite,
    exMemberCanAccess: false,
  },
  {
    name: "Metas da Casinha",
    href: "/metas",
    icon: Goal,
    exMemberCanAccess: false,
  },
  {
    name: "Área Cultural",
    href: "/cultural",
    icon: HomeIcon,
  },
  {
    name: "Tarefas",
    href: "/tarefas",
    icon: ClipboardList,
    exMemberCanAccess: false,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: Megaphone,
  },
  {
    name: "Reserva de Salinhas",
    href: "/reserva-salinhas",
    icon: CalendarClock,
    exMemberCanAccess: false,
  },
];

export const personalLinks: Links[] = [
  {
    name: "Minhas Pendências",
    href: "/minhas-pendencias",
    icon: Clock,
    exMemberCanAccess: false,
  },
  {
    name: "Meus Pontos",
    href: "/meus-pontos",
    icon: Award,
    exMemberCanAccess: false,
  },
  {
    name: "Meu Perfil",
    href: "/perfil",
    icon: CircleUser,
  },
];

export const restrictedLinks: RestrictedLinks[] = [
  {
    name: "Usuários",
    href: "/usuarios",
    icon: Users,
    roles: [
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
    exMemberCanAccess: false,
  },
  {
    name: "Solicitações de cadastro",
    href: "/aprovacao-cadastro",
    icon: TicketCheck,
    roles: [
     { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
    exMemberCanAccess: false,
  },
  {
    name: "Atualizar Estrategia",
    href: "/atualizar-estrategia",
    icon: Goal,
    roles: [
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
    exMemberCanAccess: false,
  },
  {
    name: "Conhecimento da IA",
    href: "/conhecimento-ia",
    icon: MessageCircle,
    roles: [
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
    exMemberCanAccess: false,
  },
];
