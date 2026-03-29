import { AreaRoles } from "@prisma/client";

// ─── Hierarquia de áreas ────────────────────────────────────────────
export const AREA_HIERARCHY_ORDER: readonly AreaRoles[] = [
  AreaRoles.CONSELHO,
  AreaRoles.DIRETORIA,
  AreaRoles.PRESIDENCIA,
  AreaRoles.OPERACOES,
  AreaRoles.PROJETOS,
  AreaRoles.MERCADO,
  AreaRoles.PESSOAS,
  AreaRoles.MARKETING,
  AreaRoles.ADMINISTRATIVO_FINANCEIRO,
  AreaRoles.COMERCIAL,
  AreaRoles.TATICO,
  AreaRoles.CONSULTORIA,
  AreaRoles.OUTRO,
  AreaRoles.TRAINEE,
] as const;

// ─── Labels para áreas ─────────────────────────────────────────────
export const ROLE_AREA_LABELS: Record<AreaRoles, string> = {
  [AreaRoles.CONSELHO]: "Conselho",
  [AreaRoles.DIRETORIA]: "Diretoria",
  [AreaRoles.PRESIDENCIA]: "Presidência",
  [AreaRoles.OPERACOES]: "Operações",
  [AreaRoles.PROJETOS]: "Projetos",
  [AreaRoles.MERCADO]: "Mercado",
  [AreaRoles.PESSOAS]: "Gestão de Pessoas",
  [AreaRoles.MARKETING]: "Marketing",
  [AreaRoles.ADMINISTRATIVO_FINANCEIRO]: "Administrativo & Financeiro",
  [AreaRoles.COMERCIAL]: "Comercial",
  [AreaRoles.TATICO]: "Tático",
  [AreaRoles.CONSULTORIA]: "Consultoria",
  [AreaRoles.OUTRO]: "Outro",
  [AreaRoles.TRAINEE]: "Trainee",
} as const;

// ─── Labels para link areas ────────────────────────────────────────
import { LinkAreas } from "@prisma/client";

export const LINK_AREA_LABELS: Record<LinkAreas, string> = {
  GERAL: "Geral",
  CONSULTORIA: "Consultoria",
  DIRETORIA: "Diretoria",
  TATICO: "Tático",
  PRESIDENCIA: "Presidência",
  OPERACOES: "Operações",
  PESSOAS: "Gestão de Pessoas",
  PROJETOS: "Projetos",
  MERCADO: "Mercado",
} as const;

// ─── Email ──────────────────────────────────────────────────────────
export const EMAIL_CONFIG = {
  FROM: "plataforma@empresajr.org",
  LOGO_URL: `${process.env.NEXT_PUBLIC_API_URL}/logo-azul.png`,
  APP_URL: process.env.NEXT_PUBLIC_API_URL ?? "",
} as const;

// ─── Chat / IA ──────────────────────────────────────────────────────
export const CHAT_LIMITS = {
  DIRECTOR_DAILY_MESSAGES: 40,
  MEMBER_DAILY_MESSAGES: 20,
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50 MB
} as const;

// ─── S3 Upload ──────────────────────────────────────────────────────
export const S3_UPLOAD = {
  MAX_ATTACHMENT_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  PRESIGNED_URL_EXPIRY_SECONDS: 300, // 5 minutos
} as const;

// ─── Frases de progresso de metas ───────────────────────────────────
export const GOAL_PROGRESS_PHRASES = [
  "Tamo começando!",
  "Vamo arder",
  "Tamo ardendo!",
  "Tá quase lá!",
  "Meta ALCANÇADA",
] as const;

// ─── Stop words para extração de palavras-chave ─────────────────────
export const PORTUGUESE_STOP_WORDS = new Set([
  "de", "a", "o", "que", "e", "do", "da", "em", "um", "para",
  "com", "não", "uma", "os", "no", "na", "por", "mais", "as",
  "dos", "como", "mas", "foi", "ao", "ele", "das", "tem", "à",
  "seu", "sua",
]);

// ─── Status de usuário online ───────────────────────────────────────
export const ONLINE_THRESHOLD_MINUTES = 5;

// ─── Kraken IA ──────────────────────────────────────────────────────
export const KRAKEN = {
  CACHE_TTL_DAYS: 7,
  CACHE_SIMILARITY_THRESHOLD: 0.92,
  TEMPLATE_SIMILARITY_THRESHOLD: 0.92,
  RAG_SIMILARITY_THRESHOLD: 0.7,
  RAG_TOP_K: 5,
  MAX_RECENT_MESSAGES: 6,
  CONVERSATION_SUMMARY_MODEL: "claude-haiku-4-5-20251001",
} as const;
