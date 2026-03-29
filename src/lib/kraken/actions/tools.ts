/**
 * Kraken Action Tools — definitions for Claude tool_use
 * These allow agents (especially Odin IA) to perform real actions on the platform.
 */

export interface KrakenTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const KRAKEN_TOOLS: KrakenTool[] = [
  // ─── Room Reservations ───
  {
    name: "reserve_room",
    description:
      "Reserva uma sala de reunião na plataforma Odin. Use quando o usuário quer reservar/agendar uma sala. Você DEVE pedir confirmação ao usuário antes de executar, mostrando todos os dados.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Motivo/título da reserva (ex: 'Reunião com cliente')",
        },
        date: {
          type: "string",
          description: "Data da reserva no formato YYYY-MM-DD",
        },
        hourEnter: {
          type: "string",
          description: "Horário de início no formato HH:MM (ex: '14:00')",
        },
        hourLeave: {
          type: "string",
          description: "Horário de fim no formato HH:MM (ex: '15:30')",
        },
        roomId: {
          type: "string",
          description: "ID da sala. Use list_rooms para descobrir as salas disponíveis.",
        },
      },
      required: ["title", "date", "hourEnter", "hourLeave", "roomId"],
    },
  },
  {
    name: "list_rooms",
    description:
      "Lista todas as salas disponíveis para reserva, com seus IDs e nomes. Use antes de reserve_room se o usuário não especificou qual sala.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_room_reservations",
    description:
      "Lista as reservas de salas para uma data específica. Use para verificar disponibilidade antes de reservar.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Data para consultar no formato YYYY-MM-DD",
        },
      },
      required: ["date"],
    },
  },

  // ─── Tasks ───
  {
    name: "create_task",
    description:
      "Cria uma nova tarefa na plataforma. Use quando o usuário quer criar/adicionar uma tarefa.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Título da tarefa (mínimo 3 caracteres)",
        },
        description: {
          type: "string",
          description: "Descrição detalhada da tarefa (mínimo 10 caracteres)",
        },
        deadline: {
          type: "string",
          description: "Prazo da tarefa no formato YYYY-MM-DD",
        },
        responsibles: {
          type: "array",
          items: { type: "string" },
          description: "Array de IDs dos responsáveis. Use search_users para encontrar.",
        },
      },
      required: ["title", "description", "deadline"],
    },
  },
  {
    name: "update_task_status",
    description:
      "Atualiza o status de uma tarefa existente.",
    input_schema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "ID da tarefa",
        },
        status: {
          type: "string",
          enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
          description: "Novo status da tarefa",
        },
      },
      required: ["taskId", "status"],
    },
  },

  // ─── Strategy ───
  {
    name: "update_goal_value",
    description:
      "Atualiza o valor atual ou a meta de um objetivo/indicador da casa. Requer permissão UPDATE_STRATEGY.",
    input_schema: {
      type: "object",
      properties: {
        goalId: {
          type: "string",
          description: "ID do objetivo/meta",
        },
        value: {
          type: "number",
          description: "Novo valor atual do indicador",
        },
        goal: {
          type: "number",
          description: "Nova meta alvo (target)",
        },
      },
      required: ["goalId"],
    },
  },

  // ─── User search ───
  {
    name: "search_users",
    description:
      "Busca usuários/membros pelo nome. Use para encontrar IDs de pessoas quando o usuário menciona nomes.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Nome ou parte do nome do membro para buscar",
        },
      },
      required: ["query"],
    },
  },
];

/** Get tools available for a specific agent */
export function getToolsForAgent(agentId: string): KrakenTool[] {
  switch (agentId) {
    case "odin_ia":
      return KRAKEN_TOOLS; // Odin IA has access to all tools
    case "horus_ia":
      return KRAKEN_TOOLS.filter((t) =>
        ["update_goal_value", "search_users"].includes(t.name)
      );
    default:
      return []; // Other agents don't have tool access
  }
}
