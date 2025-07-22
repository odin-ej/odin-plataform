export const simpleKeywords = [
  // Saudações e interações humanas
  "olá", "oi", "bom dia", "boa tarde", "boa noite", "tchau", "valeu", "obrigado",
  "obrigada", "de nada", "por favor", "com licença", "desculpa",

  // Perguntas simples
  "o que é", "quem é", "qual é", "onde fica", "quando foi", "me explique",
  "defina", "me diga", "me fale", "liste para mim", "resuma", "traduz",

  // Ações simples ou locais
  "crie", "escreva", "explique", "corrija", "reescreva", "resumir", "organizar",
  "planejar", "formatar", "editar", "calcular", "converter", "analisar",
];


export const toolKeywords = [
  // Negócios e economia
  "últimas notícias", "notícias recentes", "tendências de mercado",
  "cotação do dólar", "cotação do euro", "ações da bolsa",
  "ações da empresa", "valor de mercado", "ranking de empresas",
  "dados do IBGE", "relatório do governo", "situação econômica",
  "inflação atual", "PIB do Brasil", "taxa de juros", "selic hoje",

  // Dados em tempo real ou atualizados
  "dados atualizados", "dados recentes", "informações atuais",
  "tempo real", "hoje", "ontem", "agora", "último", "últimos dados",
  "atualmente", "aconteceu", "evento atual", "novidade", "previsão",

  // Esportes e resultados
  "resultado do jogo", "quem ganhou", "quem foi campeão", "ganhador",
  "vencedor", "classificação", "ranking", "placar", "partida", "jogo de",

  // Clima
  "previsão do tempo", "clima hoje",

  // Pesquisa direta
  "pesquise", "pesquisar", "procure", "buscar", "me mostra os resultados de",
  "dá uma olhada no google", "consulta externa", "consegue buscar",
  "verifica pra mim", "qual o resultado de", "qual a atualização sobre",
  "o que a internet diz sobre", "teve alguma mudança", "saiu alguma notícia",
  "foi divulgado", "pesquise no google", "busque informações",

  // Empresariais/corporativos específicos
  "posicionamento da empresa", "concorrentes da", "previsão de vendas",
  "dados financeiros recentes", "reputação online", "o que estão falando sobre",
  "feedback recente sobre", "qual a previsão para", "qual o número mais recente",
];


export function checkCommonMessages(message: string): string | null {
  const content = message.toLowerCase().trim();

  const greetings = ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite"];
  const goodbyes = ["tchau", "até mais", "falou", "até logo",'adeus'];
  const thanks = ["valeu", "obrigado", "brigado", "obrigada", "agradecido"];

  if (greetings.some((g) => content === g)) {
    return "Olá, Junior! Tudo tranquilo? Prazer, sou a Hórus IA! Assistente de inteligência virtual da Empresa JR ADM UFBA.";
  }

  if (goodbyes.some((g) => content === g)) {
    return "Até logo! Qualquer coisa, estarei por aqui.";
  }

  if (thanks.some((t) => content.includes(t))) {
    return "De nada! Se precisar de mais alguma coisa, é só chamar.";
  }

  return null; // Não é uma mensagem comum
}
