/**
 * Seed para popular as tabelas de permissões dinâmicas.
 * Idempotente - usa upsert para não duplicar registros.
 *
 * Execução: npx ts-node prisma/seed-permissions.ts
 */
import 'dotenv/config'
const { AreaRoles, PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ─── Políticas built-in ──────────────────────────────────────────────

const BUILTIN_POLICIES = [
  {
    id: "policy-directors-only",
    name: "Apenas Diretoria",
    description: "Acesso restrito a membros da Diretoria",
    allowExMembers: false,
    isPublic: false,
    isBuiltIn: true,
    rules: [{ allowedAreas: [AreaRoles.DIRETORIA], allowedRoleIds: [] }],
  },
  {
    id: "policy-members-only",
    name: "Membros Ativos",
    description: "Qualquer membro ativo (não ex-membro)",
    allowExMembers: false,
    isPublic: false,
    isBuiltIn: true,
    rules: [], // Sem regras específicas = qualquer membro ativo
  },
  {
    id: "policy-anyone-logged-in",
    name: "Qualquer Autenticado",
    description: "Qualquer usuário autenticado, incluindo ex-membros",
    allowExMembers: true,
    isPublic: true,
    isBuiltIn: true,
    rules: [],
  },
  {
    id: "policy-strategy-leaders",
    name: "Líderes de Estratégia",
    description: "Diretoria e Gerente de Performance",
    allowExMembers: false,
    isPublic: false,
    isBuiltIn: true,
    rules: [
      { allowedAreas: [AreaRoles.DIRETORIA], allowedRoleIds: [] },
      // Nota: roleIds de "Gerente de Performance" devem ser adicionados manualmente
    ],
  },
  {
    id: "policy-taticos-only",
    name: "Apenas Táticos",
    description: "Acesso restrito a membros do nível Tático",
    allowExMembers: false,
    isPublic: false,
    isBuiltIn: true,
    rules: [{ allowedAreas: [AreaRoles.TATICO], allowedRoleIds: [] }],
  },
];

// ─── Mapeamento de rotas → política ──────────────────────────────────

const ROUTE_SEED: Array<{
  path: string;
  label: string;
  policyId: string;
}> = [
  { path: "/", label: "Início", policyId: "policy-anyone-logged-in" },
  { path: "/usuarios", label: "Usuários", policyId: "policy-directors-only" },
  { path: "/atualizar-estrategia", label: "Atualizar Estratégia", policyId: "policy-strategy-leaders" },
  { path: "/aprovacao-cadastro", label: "Aprovação de Cadastro", policyId: "policy-directors-only" },
  { path: "/conhecimento-ia", label: "Conhecimento da IA", policyId: "policy-directors-only" },
  { path: "/gerenciar-link-posters", label: "Gerenciar Link Posters", policyId: "policy-directors-only" },
  { path: "/gerenciar-cargos", label: "Gerenciar Cargos", policyId: "policy-directors-only" },
  { path: "/gerenciar-jr-points", label: "Gerenciar JR Points", policyId: "policy-directors-only" },
  { path: "/gerenciar-notificacoes", label: "Gerenciar Notificações", policyId: "policy-directors-only" },
  { path: "/gerenciar-permissoes", label: "Gerenciar Permissões", policyId: "policy-directors-only" },
  { path: "/gerenciar-trainees", label: "Gerenciar Trainees", policyId: "policy-directors-only" },
  { path: "/minhas-notas", label: "Minhas Notas", policyId: "policy-members-only" },
  { path: "/tarefas", label: "Tarefas", policyId: "policy-members-only" },
  { path: "/inovacao", label: "Inovação", policyId: "policy-anyone-logged-in" },
  { path: "/chat", label: "Chat IA", policyId: "policy-members-only" },
  { path: "/oraculo", label: "Oráculo", policyId: "policy-members-only" },
  { path: "/jr-points", label: "JR Points", policyId: "policy-members-only" },
  { path: "/central-de-reservas", label: "Central de Reservas", policyId: "policy-members-only" },
  { path: "/reconhecimentos", label: "Reconhecimentos", policyId: "policy-members-only" },
  { path: "/metas", label: "Metas", policyId: "policy-members-only" },
  { path: "/meus-pontos", label: "Meus Pontos", policyId: "policy-members-only" },
  { path: "/minhas-pendencias", label: "Minhas Pendências", policyId: "policy-members-only" },
  { path: "/comunidade", label: "Comunidade", policyId: "policy-anyone-logged-in" },
  { path: "/perfil", label: "Meu Perfil", policyId: "policy-anyone-logged-in" },
  { path: "/cultural", label: "Área Cultural", policyId: "policy-anyone-logged-in" },
  { path: "/reports", label: "Reports", policyId: "policy-anyone-logged-in" },
];

// ─── Mapeamento de ações → política ──────────────────────────────────

const ACTION_SEED: Array<{
  actionKey: string;
  label: string;
  description: string;
  policyId: string;
}> = [
  { actionKey: "manage_room_reservations", label: "Gerenciar Reservas de Salas EAUFBA", description: "Criar, editar e cancelar qualquer reserva de sala", policyId: "policy-directors-only" },
  { actionKey: "view_all_room_reservations", label: "Ver Todas as Reservas de Salas", description: "Visualizar reservas de todos os membros", policyId: "policy-directors-only" },
  { actionKey: "manage_item_reservations", label: "Gerenciar Reservas de Itens", description: "Criar, editar e cancelar qualquer reserva de item", policyId: "policy-directors-only" },
  { actionKey: "approve_jr_points", label: "Aprovar Solicitações JR Points", description: "Revisar e aprovar/rejeitar solicitações de pontos", policyId: "policy-directors-only" },
  { actionKey: "manage_jr_points_config", label: "Gerenciar Configurações de JR Points", description: "Definir regras e valores para o sistema de pontos", policyId: "policy-directors-only" },
  { actionKey: "manage_users", label: "Gerenciar Usuários", description: "Criar, editar e desativar contas de usuário", policyId: "policy-directors-only" },
  { actionKey: "approve_registrations", label: "Aprovar Cadastros", description: "Revisar e aprovar/rejeitar novos cadastros", policyId: "policy-directors-only" },
  { actionKey: "manage_roles", label: "Gerenciar Cargos", description: "Criar, editar e atribuir cargos e áreas", policyId: "policy-directors-only" },
  { actionKey: "review_initiatives", label: "Revisar Iniciativas de Inovação", description: "Avaliar e dar feedback em iniciativas submetidas", policyId: "policy-directors-only" },
  { actionKey: "manage_link_posters", label: "Gerenciar Link Posters", description: "Criar, editar e remover link posters exibidos no dashboard", policyId: "policy-directors-only" },
  { actionKey: "manage_ai_knowledge", label: "Gerenciar Conhecimento da IA", description: "Criar, editar e remover conteúdos relacionados à IA", policyId: "policy-directors-only" },
  { actionKey: "update_strategy", label: "Atualizar Estratégia", description: "Editar a estratégia da empresa", policyId: "policy-strategy-leaders" },
  { actionKey: "create_recognition", label: "Criar Reconhecimento", description: "Criar e gerenciar reconhecimentos", policyId: "policy-directors-only" },
  { actionKey: "manage_recognition_models", label: "Gerenciar Modelos de Reconhecimento", description: "Criar, editar e remover modelos de reconhecimento", policyId: "policy-directors-only" },
  { actionKey: "manage_notifications", label: "Gerenciar Notificações", description: "Criar, editar e enviar notificações personalizadas para membros", policyId: "policy-directors-only" },
  { actionKey: "manage_permissions", label: "Gerenciar Permissões", description: "Configurar políticas de acesso e atribuir permissões a cargos e membros", policyId: "policy-directors-only" },
  { actionKey: "manage_trainees", label: "Gerenciar Trainees", description: "Administrar o programa de trainees, incluindo aprovação e acompanhamento", policyId: "policy-directors-only" },
  { actionKey: "manage_feed", label: "Gerenciar Feed", description: "Criar, editar e remover publicações do feed da plataforma", policyId: "policy-directors-only" },
  { actionKey: "manage_community_channels", label: "Gerenciar Canais da Comunidade", description: "Criar, editar e moderar canais de comunicação da comunidade", policyId: "policy-directors-only" },
  { actionKey: "manage_culture", label: "Gerenciar Cultura", description: "Administrar conteúdos e eventos da área cultural", policyId: "policy-directors-only" },
  { actionKey: "view_reports", label: "Visualizar Relatórios", description: "Acessar e visualizar relatórios gerenciais e operacionais", policyId: "policy-directors-only" },
  { actionKey: "manage_tasks", label: "Gerenciar Tarefas", description: "Criar, editar e atribuir tarefas para membros da equipe", policyId: "policy-directors-only" },
  { actionKey: "manage_kraken", label: "Gerenciar Agentes de IA", description: "Gerenciar agentes de IA do chat", policyId: "policy-directors-only" },
  { actionKey: "manage_kraken_knowledge", label: "Gerenciar Conhecimento do Kraken", description: "Gerir conhecimento dos agentes de IA", policyId: "policy-directors-only" },
];

async function seedPermissions() {
  console.log("🔐 Seeding permissions...");

  // 1. Criar/atualizar políticas built-in
  for (const policy of BUILTIN_POLICIES) {
    const { rules, ...policyData } = policy;

    await prisma.permissionPolicy.upsert({
      where: { id: policy.id },
      update: {
        name: policyData.name,
        description: policyData.description,
        allowExMembers: policyData.allowExMembers,
        isPublic: policyData.isPublic,
      },
      create: policyData,
    });

    // Deletar regras existentes e recriar
    await prisma.policyRule.deleteMany({ where: { policyId: policy.id } });
    for (const rule of rules) {
      await prisma.policyRule.create({
        data: {
          policyId: policy.id,
          allowedAreas: rule.allowedAreas,
          allowedRoleIds: rule.allowedRoleIds,
        },
      });
    }
  }
  console.log(`  ✅ ${BUILTIN_POLICIES.length} políticas criadas/atualizadas`);

  // 2. Criar/atualizar permissões de rota
  for (const route of ROUTE_SEED) {
    await prisma.routePermission.upsert({
      where: { path: route.path },
      update: {
        label: route.label,
        policyId: route.policyId,
      },
      create: {
        path: route.path,
        label: route.label,
        policyId: route.policyId,
        isActive: true,
      },
    });
  }
  console.log(`  ✅ ${ROUTE_SEED.length} rotas configuradas`);

  // 3. Criar/atualizar permissões de ação
  for (const action of ACTION_SEED) {
    await prisma.actionPermission.upsert({
      where: { actionKey: action.actionKey },
      update: {
        label: action.label,
        description: action.description,
        policyId: action.policyId,
      },
      create: {
        actionKey: action.actionKey,
        label: action.label,
        description: action.description,
        policyId: action.policyId,
        isActive: true,
      },
    });
  }
  console.log(`  ✅ ${ACTION_SEED.length} ações configuradas`);

  console.log("🔐 Permissions seed complete!");
}

seedPermissions()
  .catch((e) => {
    console.error("Erro no seed de permissões:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
