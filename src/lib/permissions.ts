import { MemberWithRoles } from "./schemas/memberFormSchema";
import { PermissionCheck } from "./utils";
import { AreaRoles, Prisma, Role, User } from "@prisma/client";

export const DIRECTORS_ONLY: PermissionCheck = {
  allowedAreas: [AreaRoles.DIRETORIA],
  allowExMembers: false,
};

export const TATICOS_ONLY:PermissionCheck = {
  allowedAreas: [AreaRoles.TATICO],
  allowExMembers: false
}

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
  '/gerenciar-link-posters': DIRECTORS_ONLY,
  '/gerenciar-cargos': DIRECTORS_ONLY,
  '/gerenciar-jr-points': DIRECTORS_ONLY,
  "/tarefas": MEMBERS_ONLY,
  "/chat": MEMBERS_ONLY,
  "/jr-points": MEMBERS_ONLY,
  'central-reservas': MEMBERS_ONLY,
  "/jr-points/nossa-empresa": MEMBERS_ONLY,
  "/metas": MEMBERS_ONLY,
  "/pendencias": MEMBERS_ONLY,
  "/meus-pontos": MEMBERS_ONLY,
  "/minhas-pendencias": MEMBERS_ONLY,
  '/salas-eaufba': MEMBERS_ONLY,
  "/perfil": ANYONE_LOGGED_IN,
  '/cultural': ANYONE_LOGGED_IN,
  '/reports': ANYONE_LOGGED_IN,
  '/': ANYONE_LOGGED_IN
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
  currentUser: (User & { roles: Role[], currentRole: Role }) | null
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
  const isDirector = currentUser.currentRole.area.includes(AreaRoles.DIRETORIA);

  // Se o usuário for um Diretor, adicionamos as regras de supervisão.
  if (isDirector) {
    // Pega as áreas de comando do Diretor (ex: PROJETOS, PESSOAS),
    // excluindo a área genérica 'DIRETORIA' para focar na sua especialidade.
    const commandAreas = currentUser.currentRole.area
      .filter((area) => area !== AreaRoles.DIRETORIA);

    // Adiciona as condições de supervisão ao array principal se houver áreas de comando.
    if (commandAreas.length > 0) {
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
        }
      );
    }
  }

  // Retorna a combinação final de todas as condições permitidas para o usuário.
  return {
    OR: conditions,
  };
};
