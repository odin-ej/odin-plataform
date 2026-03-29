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
import { AppAction } from "./permissions";

interface Links {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface RestrictedLinks extends Links {
  roles: Pick<Role, "name">[];
  areas?: AreaRoles[];
  requiredAction?: AppAction;
}

export const generalLinks: Links[] = [
  {
    name: "Início",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Kraken",
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
    requiredAction: AppAction.MANAGE_USERS,
    roles: [],
  },
  {
    name: "Solicitações de cadastro",
    href: "/aprovacao-cadastro",
    icon: TicketCheck,
    requiredAction: AppAction.APPROVE_REGISTRATIONS,
    roles: [],
  },
  {
    name: "Atualizar Estrategia",
    href: "/atualizar-estrategia",
    icon: Goal,
    requiredAction: AppAction.UPDATE_STRATEGY,
    roles: [],
  },
  {
    name: "Kraken IA",
    href: "/admin-kraken",
    icon: BrainCog,
    requiredAction: AppAction.MANAGE_KRAKEN,
    roles: [],
  },
  {
    name: "Kraken IA",
    href: "/admin-kraken",
    icon: BrainCog,
    requiredAction: AppAction.MANAGE_KRAKEN,
    roles: [],
  },
  {
    name: "Gerenciar Link Posters",
    href: "/gerenciar-link-posters",
    icon: Link,
    requiredAction: AppAction.MANAGE_LINK_POSTERS,
    roles: [],
  },
  {
    name: "Gerenciar Cargos",
    href: "/gerenciar-cargos",
    icon: BookUser,
    requiredAction: AppAction.MANAGE_ROLES,
    roles: [],
  },
  {
    name: "Gerenciar JR Points",
    href: "/gerenciar-jr-points",
    icon: JrPointIconWhite,
    requiredAction: AppAction.MANAGE_JR_POINTS_CONFIG,
    roles: [],
  },
  {
    name: "Gerenciar Notificações",
    href: "/gerenciar-notificacoes",
    icon: Bell,
    requiredAction: AppAction.MANAGE_NOTIFICATIONS,
    roles: [],
  },
  {
    name: "Gerenciar Trainees",
    href: "/gerenciar-trainees",
    icon: GraduationCap,
    requiredAction: AppAction.MANAGE_TRAINEES,
    roles: [],
  },
  {
    name: "Gerenciar Permissões",
    href: "/gerenciar-permissoes",
    icon: Shield,
    requiredAction: AppAction.MANAGE_PERMISSIONS,
    roles: [],
  },
];
