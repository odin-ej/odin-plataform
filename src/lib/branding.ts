/**
 * Modulo de branding do sistema de pontuacao (JR Points / Fecs Week Game).
 *
 * Proposito:
 *   - Centralizar as strings, paths e flags que controlam a aparencia do produto
 *     de pontuacao apresentado ao usuario.
 *   - Permitir reaproveitar toda a infraestrutura do JR Points (componentes,
 *     APIs, modelos do Prisma) sob um "rebrand" temporario para o Fecs Week
 *     Game, sem duplicar codigo nem alterar o backend.
 *
 * Como usar:
 *   - Componentes consomem branding via `usePointsBranding()` (ver
 *     `PointsBrandingProvider`). O default e `JR_POINTS_BRANDING`.
 *   - As paginas wrapper de `/fecs-week-game/*` envelopam o conteudo em
 *     `<PointsBrandingProvider value={FECS_WEEK_BRANDING}>`.
 *
 * Reverter ao final do evento:
 *   - Setar `FECS_WEEK_ACTIVE = false`. A sidebar volta a exibir os links do
 *     JR Points e oculta os do Fecs Week. As rotas continuam dormindo, prontas
 *     para um proximo evento.
 */

/**
 * Flag global que indica se o evento Fecs Week Game esta ativo.
 *
 * Quando `true`:
 *   - Sidebar mostra os links de `/fecs-week-game/*` e oculta os links do
 *     JR Points classico.
 * Quando `false`:
 *   - Sidebar volta ao estado padrao (JR Points visivel, Fecs Week oculto).
 *
 * As rotas de ambos os "produtos" continuam acessiveis via URL direta em
 * qualquer cenario (util para QA, transicao e reverter sem perder rotas).
 */
export const FECS_WEEK_ACTIVE = true;

/**
 * Forma do branding aplicado a UI de pontuacao.
 *
 * Os campos cobrem:
 *   - Nomes exibidos ao usuario (titulos de pagina, headers de cards).
 *   - Paths internos usados em navegacao client-side entre as 3 telas
 *     (geral, meus pontos e gerenciar).
 */
export type PointsBranding = {
  /** Nome completo do sistema (ex.: "JR Points" / "Fecs Week Points"). */
  systemName: string;
  /** Nome curto para uso em badges, chips ou breadcrumbs. */
  shortName: string;
  /** Rotulo aplicado a unidade de pontuacao em si (ex.: "JR Points", "Fecs Points"). */
  pointsLabel: string;
  /** Path da pagina geral/ranking. */
  basePath: string;
  /** Path da pagina pessoal de historico/solicitacoes. */
  myPointsPath: string;
  /** Path da pagina administrativa (gestao de pontuacao). */
  managePath: string;
  /** Titulo da pagina geral (usado em metadata e em headers). */
  pageTitleHome: string;
  /** Titulo da pagina pessoal. */
  pageTitleMyPoints: string;
  /** Titulo da pagina administrativa. */
  pageTitleManage: string;
  /** Titulo do header principal da pagina geral. */
  homeHeaderTitle: string;
  /** Titulo do header principal da pagina administrativa. */
  manageHeaderTitle: string;
  /** Descricao do header da pagina administrativa. */
  manageHeaderDescription: string;
};

/**
 * Branding padrao (JR Points classico).
 *
 * Aplicado automaticamente a qualquer componente que use `usePointsBranding`
 * sem um Provider acima — ou seja, manter as paginas e fluxos antigos
 * funcionando exatamente como antes.
 */
export const JR_POINTS_BRANDING: PointsBranding = {
  systemName: "JR Points",
  shortName: "JR Points",
  pointsLabel: "JR Points",
  basePath: "/jr-points",
  myPointsPath: "/meus-pontos",
  managePath: "/gerenciar-jr-points",
  pageTitleHome: "Geral - JR Points",
  pageTitleMyPoints: "Meus Pontos",
  pageTitleManage: "Gerenciar JR Points",
  homeHeaderTitle: "JR Points",
  manageHeaderTitle: "Controle do JR Points",
  manageHeaderDescription:
    "Controle todo o funcionamento do JR-Points, gerenciando pontuacao, acoes, modelos e categorias.",
};

/**
 * Branding do evento Fecs Week Game.
 *
 * Aplicado pelos wrappers em `src/app/(dashboard)/fecs-week-game/*`. Reusa toda
 * a infraestrutura do JR Points (APIs, modelos, componentes) — apenas a
 * camada de strings e os paths internos sao trocados.
 */
export const FECS_WEEK_BRANDING: PointsBranding = {
  systemName: "Fecs Week Points",
  shortName: "Fecs Week",
  pointsLabel: "Fecs Points",
  basePath: "/fecs-week-game",
  myPointsPath: "/fecs-week-game/meus-pontos",
  managePath: "/fecs-week-game/gerenciar",
  pageTitleHome: "Geral - Fecs Week Game",
  pageTitleMyPoints: "Meus Pontos - Fecs Week Game",
  pageTitleManage: "Gerenciar Fecs Week Game",
  homeHeaderTitle: "Fecs Week Game",
  manageHeaderTitle: "Controle do Fecs Week Game",
  manageHeaderDescription:
    "Controle todo o funcionamento do Fecs Week Game, gerenciando pontuacao, acoes, modelos e categorias.",
};
