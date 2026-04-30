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
  Settings2,
  Shield,
  TicketCheck,
  Users,
  Trophy,
  UsersRound
} from "lucide-react";
import { JrPointIconWhite } from "@/app/_components/Global/JrPointsIcon";
import { AppAction } from "./permissions";
import { FECS_WEEK_ACTIVE } from "./branding";

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

interface AreaLink extends Links {
  requiredAction: AppAction;
}

// Link de pontuacao geral exibido na sidebar.
// Durante o Fecs Week Game (FECS_WEEK_ACTIVE === true), a entrada aponta
// para a rota do evento; caso contrario, retorna ao link tradicional do
// JR Points. As rotas continuam acessiveis via URL direta nos dois casos.
const pointsGeneralLink: Links = FECS_WEEK_ACTIVE
  ? {
      name: "Fecs Week Game",
      href: "/fecs-week-game",
      icon: JrPointIconWhite,
    }
  : {
      name: "JR Points",
      href: "/jr-points",
      icon: JrPointIconWhite,
    };

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
  pointsGeneralLink,
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

// Link pessoal de pontos exibido na sidebar.
// Durante o Fecs Week Game, aponta para a rota pessoal do evento; caso
// contrario, retorna ao caminho tradicional do JR Points.
const myPointsPersonalLink: Links = FECS_WEEK_ACTIVE
  ? {
      name: "Meus Pontos (Fecs Week)",
      href: "/fecs-week-game/meus-pontos",
      icon: Award,
    }
  : {
      name: "Meus Pontos",
      href: "/meus-pontos",
      icon: Award,
    };

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
  myPointsPersonalLink,
  {
    name: "Meu Perfil",
    href: "/perfil",
    icon: CircleUser,
  },
];

export const areaLinks: AreaLink[] = [
  {
    name: "Operações",
    href: "/areas/operacoes",
    icon: Settings2,
    requiredAction: AppAction.ACCESS_AREA_OPERACOES,
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
  // Gerenciamento da pontuacao. Durante o Fecs Week Game, o link aponta para
  // a rota administrativa do evento. A action `MANAGE_JR_POINTS_CONFIG`
  // continua a mesma — basta remapea-la para `policy-fecs-week-approvers` em
  // /gerenciar-permissoes para que os aprovadores designados enxerguem o link.
  FECS_WEEK_ACTIVE
    ? {
        name: "Gerenciar Fecs Week",
        href: "/fecs-week-game/gerenciar",
        icon: JrPointIconWhite,
        requiredAction: AppAction.MANAGE_JR_POINTS_CONFIG,
        roles: [],
      }
    : {
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
