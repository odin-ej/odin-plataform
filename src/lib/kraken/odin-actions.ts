/**
 * Odin IA Platform Actions
 *
 * Maps all platform operations that Odin IA can execute on behalf of users.
 * Each action is a function call tool that Claude can invoke.
 *
 * SAFETY: Every destructive action requires user confirmation before execution.
 * The agent returns a confirmation request, and only after user approval
 * does the backend execute the action.
 */

export interface OdinAction {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  /** Which AppAction permission the user needs */
  requiredPermission?: string;
  /** Whether this action requires explicit user confirmation */
  requiresConfirmation: boolean;
}

/**
 * All platform actions available to Odin IA.
 * These are converted to Claude tool_use format at runtime.
 */
export const ODIN_ACTIONS: OdinAction[] = [
  // --- RESERVATIONS ---
  {
    name: "criar_reserva_sala",
    description: "Reserva uma sala/espaço para o usuário. Precisa do nome da sala, data, horário de início e fim, e motivo.",
    parameters: {
      roomName: { type: "string", description: "Nome da sala (ex: 'Salinha de Talentos', 'Sala de Reuniões')", required: true },
      date: { type: "string", description: "Data da reserva no formato YYYY-MM-DD", required: true },
      startTime: { type: "string", description: "Horário de início no formato HH:MM", required: true },
      endTime: { type: "string", description: "Horário de fim no formato HH:MM", required: true },
      title: { type: "string", description: "Motivo/descrição da reserva", required: true },
    },
    requiresConfirmation: true,
  },
  {
    name: "cancelar_reserva",
    description: "Cancela uma reserva existente do usuário.",
    parameters: {
      reservationId: { type: "string", description: "ID da reserva a cancelar", required: true },
    },
    requiresConfirmation: true,
  },
  {
    name: "listar_salas_disponiveis",
    description: "Verifica quais salas estão disponíveis em uma data e horário específicos.",
    parameters: {
      date: { type: "string", description: "Data para verificar (YYYY-MM-DD)", required: true },
      startTime: { type: "string", description: "Horário de início (HH:MM)", required: false },
      endTime: { type: "string", description: "Horário de fim (HH:MM)", required: false },
    },
    requiresConfirmation: false,
  },

  // --- TASKS ---
  {
    name: "criar_tarefa",
    description: "Cria uma nova tarefa na plataforma.",
    parameters: {
      title: { type: "string", description: "Título da tarefa", required: true },
      description: { type: "string", description: "Descrição detalhada", required: false },
      deadline: { type: "string", description: "Prazo no formato YYYY-MM-DD", required: false },
      assignees: { type: "string", description: "Nomes dos responsáveis separados por vírgula", required: false },
    },
    requiresConfirmation: true,
  },
  {
    name: "listar_minhas_tarefas",
    description: "Lista as tarefas pendentes do usuário.",
    parameters: {},
    requiresConfirmation: false,
  },

  // --- RECOGNITIONS ---
  {
    name: "criar_reconhecimento",
    description: "Cria um reconhecimento/destaque para um membro da casinha.",
    parameters: {
      recipientName: { type: "string", description: "Nome completo de quem vai receber", required: true },
      description: { type: "string", description: "Descrição do reconhecimento", required: true },
      date: { type: "string", description: "Data do reconhecimento (YYYY-MM-DD)", required: false },
    },
    requiresConfirmation: true,
  },

  // --- STRATEGY ---
  {
    name: "consultar_estrategia",
    description: "Consulta a estratégia atual da empresa: missão, visão, valores, OKRs, metas.",
    parameters: {},
    requiresConfirmation: false,
  },
  {
    name: "atualizar_meta",
    description: "Atualiza o valor de uma meta estratégica.",
    parameters: {
      goalName: { type: "string", description: "Nome da meta a atualizar", required: true },
      newValue: { type: "string", description: "Novo valor/target da meta", required: true },
      reason: { type: "string", description: "Motivo da alteração", required: false },
    },
    requiredPermission: "UPDATE_STRATEGY",
    requiresConfirmation: true,
  },

  // --- JR POINTS ---
  {
    name: "solicitar_jr_points",
    description: "Cria uma solicitação de JR Points para o usuário.",
    parameters: {
      actionType: { type: "string", description: "Tipo de ação que gerou os pontos", required: true },
      description: { type: "string", description: "Descrição da atividade realizada", required: true },
      points: { type: "number", description: "Quantidade de pontos solicitados", required: false },
    },
    requiresConfirmation: true,
  },

  // --- NOTIFICATIONS ---
  {
    name: "enviar_notificacao",
    description: "Envia uma notificação para um ou mais membros.",
    parameters: {
      recipientNames: { type: "string", description: "Nomes dos destinatários separados por vírgula", required: true },
      title: { type: "string", description: "Título da notificação", required: true },
      message: { type: "string", description: "Conteúdo da notificação", required: true },
    },
    requiresConfirmation: true,
  },

  // --- USEFUL LINKS ---
  {
    name: "criar_link_util",
    description: "Adiciona um link útil ao painel da empresa.",
    parameters: {
      title: { type: "string", description: "Título do link", required: true },
      url: { type: "string", description: "URL do link", required: true },
      description: { type: "string", description: "Descrição do link", required: false },
    },
    requiresConfirmation: true,
  },
];

/**
 * Convert ODIN_ACTIONS to Claude tool_use format for the API call.
 */
export function getOdinToolDefinitions() {
  return ODIN_ACTIONS.map((action) => ({
    name: action.name,
    description: action.description,
    input_schema: {
      type: "object" as const,
      properties: Object.fromEntries(
        Object.entries(action.parameters).map(([key, param]) => [
          key,
          { type: param.type, description: param.description },
        ])
      ),
      required: Object.entries(action.parameters)
        .filter(([, param]) => param.required)
        .map(([key]) => key),
    },
  }));
}

/**
 * Check if an action requires confirmation.
 */
export function actionRequiresConfirmation(actionName: string): boolean {
  const action = ODIN_ACTIONS.find((a) => a.name === actionName);
  return action?.requiresConfirmation ?? true;
}

/**
 * Format a confirmation message for the user.
 */
export function formatConfirmationMessage(
  actionName: string,
  params: Record<string, unknown>
): string {
  const action = ODIN_ACTIONS.find((a) => a.name === actionName);
  if (!action) return "Ação desconhecida.";

  const paramList = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => {
      const paramDef = action.parameters[k];
      return `- **${paramDef?.description || k}:** ${v}`;
    })
    .join("\n");

  return `Você deseja executar a seguinte ação?\n\n**${action.description}**\n\n${paramList}\n\nResponda **"sim"** para confirmar ou **"não"** para cancelar.`;
}
