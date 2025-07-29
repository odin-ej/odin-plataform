import { MemberWithRoles } from "./schemas/memberFormSchema";
import { PermissionCheck } from "./utils";
import { AreaRoles, Prisma, Role, User } from "@prisma/client";

export const DIRECTORS_ONLY: PermissionCheck = {
  allowedAreas: [AreaRoles.DIRETORIA],
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

export const ROUTE_PERMISSIONS: Record<string, PermissionCheck> = {
  "/usuarios": DIRECTORS_ONLY,
  "/atualizar-estrategia": DIRECTORS_ONLY,
  "/aprovacao-cadastro": DIRECTORS_ONLY,
  '/conhecimento-ia': DIRECTORS_ONLY,
  "/tarefas": MEMBERS_ONLY,
  "/chat": MEMBERS_ONLY,
  "/jr-points": MEMBERS_ONLY,
  "/metas": MEMBERS_ONLY,
  "/pendencias": MEMBERS_ONLY,
  "/meus-pontos": MEMBERS_ONLY,
  // Rotas como '/' (Início), '/perfil', '/cultural' e '/reports' não estão aqui,
  // então elas serão acessíveis por qualquer usuário autenticado (incluindo ex-membros,
  // se a lógica padrão permitir).
};

const HIERARCHY_LEVELS: Partial<Record<AreaRoles, number>> = {
  [AreaRoles.DIRETORIA]: 3,
  [AreaRoles.CONSELHO]: 3,
  [AreaRoles.TATICO]: 2,
  [AreaRoles.CONSULTORIA]: 1,
};

// Função auxiliar para obter o nível hierárquico máximo de um usuário
const getUserHierarchyLevel = (user: User & { roles: Role[] }): number => {
  // Se não tiver cargo, é nível base

  // Retorna o maior nível hierárquico entre todos os cargos do usuário
  if (user.isExMember) return -1;
  if (!user.roles.length) return 0;

  const levels = user.roles.flatMap((role) =>
    (role.area || []).map((area) => HIERARCHY_LEVELS[area] ?? 0)
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
  allUsers: MemberWithRoles[]
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
  currentUser: (User & { roles: Role[] }) | null
): Prisma.TaskWhereInput => {
  if (!currentUser) {
    // Se não houver usuário, não retorna nenhuma tarefa
    return { id: { equals: "no-tasks" } };
  }

  const currentUserLevel = getUserHierarchyLevel(currentUser);

  // Diretoria pode ver todas as tarefas
  if (currentUserLevel === HIERARCHY_LEVELS.DIRETORIA) {
    return {}; // Retorna um objeto vazio para não aplicar filtros
  }

  // Outros usuários podem ver tarefas atribuídas a eles OU a usuários de nível inferior
  const subordinateLevels = Object.entries(HIERARCHY_LEVELS)
    .filter(([, level]) => level < currentUserLevel)
    .map(([area]) => area as AreaRoles);

  return {
    OR: [
      // 1. Tarefas pelas quais o usuário atual é responsável
      {
        responsibles: {
          some: {
            id: currentUser.id,
          },
        },
      },
      // 2. Tarefas cujos responsáveis pertencem a uma área hierárquica inferior
      {
        responsibles: {
          some: {
            roles: {
              some: {
                area: {
                  hasSome: subordinateLevels,
                },
              },
            },
          },
        },
      },
    ],
  };
};
