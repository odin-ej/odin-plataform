import {
  MemberWithFullRoles,
  MemberWithRoles,
} from "./schemas/memberFormSchema";
import { FullUser } from "./server-utils";
import { PermissionCheck } from "./utils";
import { AreaRoles, Prisma, Role, User } from "@prisma/client";

export const DIRECTORS_ONLY: PermissionCheck = {
  allowedAreas: [AreaRoles.DIRETORIA],
  allowExMembers: false,
};

export const TATICOS_ONLY: PermissionCheck = {
  allowedAreas: [AreaRoles.TATICO],
  allowExMembers: false,
};

/**
 * Permissão apenas para membros ativos da empresa.
 * Ex-membros não são permitidos.
 */
export const MEMBERS_ONLY: PermissionCheck = {
  allowExMembers: false,
};

/**
 * Permissão para qualquer usuário autenticado que seja um membro ativo.
 * É um alias para MEMBERS_ONLY, mas com um nome mais explícito para certos contextos.
 */
export const ANY_ACTIVE_MEMBER: PermissionCheck = {
  allowExMembers: false,
};

/**
 * Permissão para qualquer usuário autenticado, incluindo ex-membros.
 * Útil para páginas de perfil ou áreas culturais gerais.
 */
export const ANYONE_LOGGED_IN: PermissionCheck = {
  allowExMembers: true,
};

export const TACTICAL_AND_COMMITTEE_LEADERS: PermissionCheck = {
  allowedAreas: [AreaRoles.TATICO],
  allowedRoles: ["Liderança de Comitê"], // Certifique-se de que o nome do cargo corresponde exatamente ao do seu banco de dados
  allowExMembers: false,
};

export const INOVATION_LEADERS: PermissionCheck = {
  allowedRoles: [
    "Gerente de Produtos",
    "Gerente de Desenvolvimento",
    "Diretor(a) de Projetos",
    "Diretor(a) de Mercado",
    "Diretor(a) de Operações",
    "Diretor(a) de Presidência",
    "Diretor(a) de Gestão de Pessoas",
  ],
  allowExMembers: false,
};

export const STRATEGY_LEADERS: PermissionCheck = {
  allowedAreas: [AreaRoles.DIRETORIA],
  allowedRoles: ["Gerente de Performance"],
  allowExMembers: false,
};

export const ROUTE_PERMISSIONS: Record<string, PermissionCheck> = {
  "/usuarios": DIRECTORS_ONLY,
  "/atualizar-estrategia": STRATEGY_LEADERS,
  "/aprovacao-cadastro": DIRECTORS_ONLY,
  "/conhecimento-ia": DIRECTORS_ONLY,
  "/gerenciar-link-posters": DIRECTORS_ONLY,
  "/gerenciar-cargos": DIRECTORS_ONLY,
  "/gerenciar-jr-points": DIRECTORS_ONLY,
  "/gerenciar-notificacoes": DIRECTORS_ONLY,
  "/gerenciar-trainees": DIRECTORS_ONLY,
  "/minhas-notas": MEMBERS_ONLY,
  "/gerenciar-permissoes": DIRECTORS_ONLY,
  "/tarefas": MEMBERS_ONLY,
  "/inovacao": ANYONE_LOGGED_IN,
  "/chat": MEMBERS_ONLY,
  "/oraculo": MEMBERS_ONLY,
  "/jr-points": MEMBERS_ONLY,
  "/central-de-reservas": MEMBERS_ONLY,
  "/reconhecimentos": MEMBERS_ONLY,
  "/metas": MEMBERS_ONLY,
  "/meus-pontos": MEMBERS_ONLY,
  "/minhas-pendencias": MEMBERS_ONLY,
  "/comunidade": ANYONE_LOGGED_IN,
  "/perfil": ANYONE_LOGGED_IN,
  "/cultural": ANYONE_LOGGED_IN,
  "/reports": ANYONE_LOGGED_IN,
  "/": ANYONE_LOGGED_IN,
};



const HIERARCHY_LEVELS: Partial<Record<AreaRoles, number>> = {
  [AreaRoles.DIRETORIA]: 3,
  [AreaRoles.CONSELHO]: 3,
  [AreaRoles.TATICO]: 2,
  [AreaRoles.CONSULTORIA]: 1,
};

export enum AppAction {
  // Reservas
  MANAGE_ROOM_RESERVATIONS   = "manage_room_reservations",
  VIEW_ALL_ROOM_RESERVATIONS = "view_all_room_reservations",
  MANAGE_ITEM_RESERVATIONS   = "manage_item_reservations",

  // JR Points
  APPROVE_JR_POINTS          = "approve_jr_points",
  MANAGE_JR_POINTS_CONFIG    = "manage_jr_points_config",

  // Usuários
  MANAGE_USERS               = "manage_users",
  APPROVE_REGISTRATIONS      = "approve_registrations",
  MANAGE_ROLES               = "manage_roles",

  // Inovação
  REVIEW_INITIATIVES         = "review_initiatives",

  // Conteúdo
  MANAGE_LINK_POSTERS        = "manage_link_posters",
  MANAGE_AI_KNOWLEDGE        = "manage_ai_knowledge",
  UPDATE_STRATEGY            = "update_strategy",

  // Reconhecimentos
  CREATE_RECOGNITION         = "create_recognition",
  MANAGE_RECOGNITION_MODELS  = "manage_recognition_models",

  // Notificações
  MANAGE_NOTIFICATIONS       = "manage_notifications",

  // Gestão e Administração
  MANAGE_PERMISSIONS         = "manage_permissions",
  MANAGE_TRAINEES            = "manage_trainees",
  MANAGE_FEED                = "manage_feed",
  MANAGE_COMMUNITY_CHANNELS  = "manage_community_channels",
  MANAGE_CULTURE             = "manage_culture",
  VIEW_REPORTS               = "view_reports",
  MANAGE_TASKS               = "manage_tasks",
}

/**
 * Metadados das ações para exibição na UI de admin e para seed.
 * Adicione aqui quando criar uma nova ação.
 */
export const ACTION_METADATA: Record<AppAction, { label: string; description: string }> = {
  [AppAction.MANAGE_ROOM_RESERVATIONS]: {
    label: "Gerenciar Reservas de Salas EAUFBA",
    description: "Criar, editar e cancelar qualquer reserva de sala",
  },
  [AppAction.VIEW_ALL_ROOM_RESERVATIONS]: {
    label: "Ver Todas as Reservas de Salas",
    description: "Visualizar reservas de todos os membros",
  },
  [AppAction.MANAGE_ITEM_RESERVATIONS]: {
    label: "Gerenciar Reservas de Itens",
    description: "Criar, editar e cancelar qualquer reserva de item",
  },
  [AppAction.APPROVE_JR_POINTS]: {
    label: "Aprovar Solicitações JR Points",
    description: "Revisar e aprovar/rejeitar solicitações de pontos",
  },
  [AppAction.MANAGE_JR_POINTS_CONFIG]: {
    label: "Gerenciar Configurações de JR Points",
    description: "Definir regras e valores para o sistema de pontos", 
  },
  [AppAction.MANAGE_USERS]: {
    label: "Gerenciar Usuários",
    description: "Criar, editar e desativar contas de usuário",
  },
  [AppAction.APPROVE_REGISTRATIONS]: {
    label: "Aprovar Cadastros",
    description: "Revisar e aprovar/rejeitar novos cadastros",
  },
  [AppAction.MANAGE_ROLES]: {
    label: "Gerenciar Cargos",
    description: "Criar, editar e atribuir cargos e áreas",
  },
  [AppAction.REVIEW_INITIATIVES]: {
    label: "Revisar Iniciativas de Inovação",
    description: "Avaliar e dar feedback em iniciativas submetidas",
  },
  [AppAction.MANAGE_LINK_POSTERS]: {
    label: "Gerenciar Link Posters",
    description: "Criar, editar e remover link posters exibidos no dashboard",
  },
  [AppAction.MANAGE_AI_KNOWLEDGE]: {
    label: "Gerenciar Conhecimento da IA",
    description: "Criar, editar e remover conteúdos relacionados à IA",
  },
  [AppAction.UPDATE_STRATEGY]: {
    label: "Atualizar Estratégia",
    description: "Editar a estratégia da empresa, incluindo missão, visão, valores e objetivos",
  },
  [AppAction.CREATE_RECOGNITION]: {
    label: "Criar Reconhecimento",
    description: "Criar e gerenciar reconhecimentos",
  },
  [AppAction.MANAGE_RECOGNITION_MODELS]: {
    label: "Gerenciar Modelos de Reconhecimento",
    description: "Criar, editar e remover modelos de reconhecimento",
  },
  [AppAction.MANAGE_NOTIFICATIONS]: {
    label: "Gerenciar Notificações",
    description: "Criar, editar e enviar notificações personalizadas para membros",
  },
  [AppAction.MANAGE_PERMISSIONS]: {
    label: "Gerenciar Permissões",
    description: "Configurar políticas de acesso e atribuir permissões a cargos e membros",
  },
  [AppAction.MANAGE_TRAINEES]: {
    label: "Gerenciar Trainees",
    description: "Administrar o programa de trainees, incluindo aprovação e acompanhamento",
  },
  [AppAction.MANAGE_FEED]: {
    label: "Gerenciar Feed",
    description: "Criar, editar e remover publicações do feed da plataforma",
  },
  [AppAction.MANAGE_COMMUNITY_CHANNELS]: {
    label: "Gerenciar Canais da Comunidade",
    description: "Criar, editar e moderar canais de comunicação da comunidade",
  },
  [AppAction.MANAGE_CULTURE]: {
    label: "Gerenciar Cultura",
    description: "Administrar conteúdos e eventos da área cultural",
  },
  [AppAction.VIEW_REPORTS]: {
    label: "Visualizar Relatórios",
    description: "Acessar e visualizar relatórios gerenciais e operacionais",
  },
  [AppAction.MANAGE_TASKS]: {
    label: "Gerenciar Tarefas",
    description: "Criar, editar e atribuir tarefas para membros da equipe",
  },
} as const;

// Função auxiliar para obter o nível hierárquico máximo de um usuário
const getUserHierarchyLevel = (user: User & { roles: Role[] }): number => {
  // Se não tiver cargo, é nível base

  // Retorna o maior nível hierárquico entre todos os cargos do usuário
  if (user.isExMember) return -1;
  if (!user.roles.length) return 0;

  const levels = user.roles.flatMap((role) =>
    (role.area || []).map((area) => HIERARCHY_LEVELS[area] ?? 0),
  );

  return levels.length > 0 ? Math.max(...levels) : 0;
};

/**
 * Filtra uma lista de usuários para mostrar apenas aqueles que o usuário atual pode gerenciar/atribuir tarefas.
 * @param currentUser O usuário que está a realizar a ação.
 * @param allUsers A lista completa de todos os usuários.
 * @returns Uma lista de usuários filtrada com base na hierarquia.
 */
export const getAssignableUsers = (
  currentUser: MemberWithRoles | null,
  allUsers: MemberWithRoles[],
): MemberWithRoles[] => {
  if (!currentUser) return [];

  const currentUserLevel = getUserHierarchyLevel(currentUser);
  // Outros níveis só podem atribuir para níveis estritamente inferiores
  return allUsers.filter((user) => {
    const userLevel = getUserHierarchyLevel(user);
    // Permite atribuir para si mesmo OU para níveis inferiores
    return user.id === currentUser.id || userLevel < currentUserLevel;
  });
};

/**
 * Cria uma cláusula 'where' do Prisma para filtrar tarefas com base na hierarquia do usuário.
 * @param currentUser O usuário que está a visualizar as tarefas.
 * @returns Um objeto Prisma.TaskWhereInput para ser usado em `prisma.task.findMany`.
 */
export const getTasksWhereClauseForUser = (
  currentUser: FullUser | MemberWithFullRoles | null,
): Prisma.TaskWhereInput => {
  // Se não houver usuário logado, não retorna nenhuma tarefa.
  if (!currentUser) {
    return { id: { equals: "no-tasks-for-guest" } };
  }

  // --- CONDIÇÕES BÁSICAS (Para TODOS os usuários) ---
  // Um array que começa com as regras que se aplicam a todos.
  const conditions: Prisma.TaskWhereInput[] = [
    // Condição 1: Tarefas criadas PELO usuário atual.
    {
      authorId: currentUser.id,
    },
    // Condição 2: Tarefas onde o usuário atual é UM DOS responsáveis.
    {
      responsibles: {
        some: {
          id: currentUser.id,
        },
      },
    },
  ];

  // --- CONDIÇÕES DE LIDERANÇA (Apenas para Diretores) ---

  // Verifica se o usuário tem o nível de 'Diretoria' em algum de seus cargos.
  const isDirector = currentUser.currentRole?.area.includes(
    AreaRoles.DIRETORIA,
  );

  // Se o usuário for um Diretor, adicionamos as regras de supervisão.
  if (isDirector) {
    // Pega as áreas de comando do Diretor (ex: PROJETOS, PESSOAS),
    // excluindo a área genérica 'DIRETORIA' para focar na sua especialidade.
    const commandAreas = currentUser.currentRole?.area.filter(
      (area) => area !== AreaRoles.DIRETORIA,
    );

    // Adiciona as condições de supervisão ao array principal se houver áreas de comando.
    if (commandAreas !== undefined && commandAreas.length > 0) {
      conditions.push(
        // Condição 3: Tarefas onde OS RESPONSÁVEIS pertencem à área de comando do Diretor.
        {
          responsibles: {
            some: {
              roles: {
                some: {
                  area: {
                    hasSome: commandAreas,
                  },
                },
              },
            },
          },
        },
        // Condição 4: Tarefas CRIADAS POR ALGUÉM da área de comando do Diretor.
        {
          author: {
            roles: {
              some: {
                area: {
                  hasSome: commandAreas,
                },
              },
            },
          },
        },
      );
    }
  }

  // Retorna a combinação final de todas as condições permitidas para o usuário.
  return {
    OR: conditions,
  };
};


