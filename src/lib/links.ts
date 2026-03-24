import { Role, AreaRoles } from "@prisma/client";
import {
  Award,
  Bell,
  BookUser,
  BrainCog,
  CalendarClock,
  CircleUser,
  ClipboardList,
  Clock,
  EyeIcon,
  Goal,
  GraduationCap,
  HomeIcon,
  LayoutDashboard,
  Lightbulb,
  Link,
  Megaphone,
  MessageSquare,
  Shield,
  TicketCheck,
  Users,
  Trophy,
  UsersRound
} from "lucide-react";
import { JrPointIconWhite } from "@/app/_components/Global/JrPointsIcon";

interface Links {
  name: string;
  href: string;
  icon: React.ElementType;
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
  },
  {
    name: "JR Points",
    href: "/jr-points",
    icon: JrPointIconWhite,
  },
  {
    name: "Metas da Casinha",
    href: "/metas",
    icon: Goal,
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
  },
  {
    name: "Reports",
    href: "/reports",
    icon: Megaphone,
  },
  {
    name: "Central de Reservas",
    href: "/central-de-reservas",
    icon: CalendarClock,
  },
  {
    name: "Oráculo",
    href: "/oraculo",
    icon: EyeIcon,
  },
  {
    name: 'Comunidade',
    href: '/comunidade',
    icon: UsersRound,
  },
  {
    name: 'Inovação',
    href: '/inovacao',
    icon: Lightbulb,
  },
  {
    name: 'Reconhecimentos',
    href: '/reconhecimentos',
    icon: Trophy,
  }
];

export const personalLinks: Links[] = [
  {
    name: "Minhas Notas",
    href: "/minhas-notas",
    icon: GraduationCap,
  },
  {
    name: "Minhas Pendências",
    href: "/minhas-pendencias",
    icon: Clock,
  },
  {
    name: "Meus Pontos",
    href: "/meus-pontos",
    icon: Award,
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
      { name: "Conselho" },
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
  },
  {
    name: "Solicitações de cadastro",
    href: "/aprovacao-cadastro",
    icon: TicketCheck,
    roles: [
      { name: "Conselho" },
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
  },
  {
    name: "Atualizar Estrategia",
    href: "/atualizar-estrategia",
    icon: Goal,
    roles: [
      { name: "Conselho" },
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
      { name: "Gerente de Performance" },
    ],
  },
  {
    name: "Conhecimento da IA",
    href: "/conhecimento-ia",
    icon: BrainCog,
    roles: [
      { name: "Conselho" },
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
  },
  {
    name: "Gerenciar Link Posters",
    href: "/gerenciar-link-posters",
    icon: Link,
    roles: [
      { name: "Conselho" },
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
  },
  {
    name: "Gerenciar Cargos",
    href: "/gerenciar-cargos",
    icon: BookUser,
    roles: [
      { name: "Conselho" },
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
  },
  {
    name: "Gerenciar JR Points",
    href: "/gerenciar-jr-points",
    icon: JrPointIconWhite,
    roles: [
      { name: "Conselho" },
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
  },
  {
    name: "Gerenciar Notificações",
    href: "/gerenciar-notificacoes",
    icon: Bell,
    roles: [
      { name: "Conselho" },
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
  },
  {
    name: "Gerenciar Trainees",
    href: "/gerenciar-trainees",
    icon: GraduationCap,
     roles: [
      { name: "Conselho" },
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
  },
  {
    name: "Gerenciar Permissões",
    href: "/gerenciar-permissoes",
    icon: Shield,
    roles: [
      { name: "Conselho" },
      { name: "Diretor(a) Presidente" },
      { name: "Diretor(a) de Gestão de Pessoas" },
      { name: "Diretor(a) de Mercado" },
      { name: "Diretor(a) de Operações" },
      { name: "Diretor(a) de Projetos" },
    ],
  },
];
