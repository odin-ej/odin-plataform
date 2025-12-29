import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Role, AreaRoles, LinkAreas, User } from "@prisma/client";
import { MemberWithFullRoles, UserProfileValues } from "./schemas/memberFormSchema";
import { ExMemberType } from "./schemas/exMemberFormSchema";
import { FieldConfig } from "@/app/_components/Global/Custom/CustomModal";
import { Path } from "react-hook-form";
import { ROUTE_PERMISSIONS } from "./permissions";
import * as XLSX from "xlsx";
import { FullUser } from "./server-utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateForInput(
  date: Date | string | null | undefined
): string {
  if (!date) return "";

  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) return "";

  // getUTCDate garante que não haverá problemas com fuso horário
  const day = String(dateObj.getUTCDate()).padStart(2, "0");
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0"); // Mês é 0-indexado
  const year = dateObj.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

export function orderRolesByHiearchy(roles: Role[]) {
  const areaOrder = [
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
  ];

  // Passo 2: Crie uma função para encontrar a área de maior prioridade de um cargo
  const getHighestPriorityAreaIndex = (roleAreas: AreaRoles[]) => {
    let highestPriorityIndex = Infinity;
    for (const area of roleAreas) {
      const index = areaOrder.indexOf(area);
      if (index !== -1 && index < highestPriorityIndex) {
        highestPriorityIndex = index;
      }
    }
    return highestPriorityIndex;
  };
  if (!Array.isArray(roles)) {
    return [];
  }
  // Passo 3: Use a função .sort() com a lógica de comparação correta.
  // Usamos .slice() para criar uma cópia e não modificar o array original.
  const orderedRoles = [...roles].sort((a, b) => {
    const priorityA = getHighestPriorityAreaIndex(a.area);
    const priorityB = getHighestPriorityAreaIndex(b.area);

    // Compara os cargos com base na sua área de maior prioridade.
    return priorityA - priorityB;
  });
  return orderedRoles;
}

export const getModalFields = <T extends UserProfileValues | ExMemberType>(
  isExMember: boolean,
  selectedRoles: string[],
  isWorking: boolean
): FieldConfig<T>[] => {
  const commonFields: FieldConfig<T>[] = [
    { accessorKey: "name" as Path<T>, header: "Nome Completo" },
    { accessorKey: "email" as Path<T>, header: "E-mail Pessoal" },
    { accessorKey: "emailEJ" as Path<T>, header: "E-mail EJ" },
    { accessorKey: "phone" as Path<T>, header: "Telefone", mask: "phone" },
    {
      accessorKey: "birthDate" as Path<T>,
      header: "Data de Nascimento",
      mask: "date",
    },
    {
      accessorKey: "semesterEntryEj" as Path<T>,
      header: "Semestre de Entrada",
    },
    { accessorKey: "course" as Path<T>, header: "Curso" },
    { accessorKey: "about" as Path<T>, header: "Sobre" },
    { accessorKey: "linkedin" as Path<T>, header: "Linkedin" },
    { accessorKey: "instagram" as Path<T>, header: "Instagram" },
    {
      accessorKey: "isExMember" as Path<T>,
      header: "Ex-Membro",
      type: "select",
      options: [
        { value: "Sim", label: "Sim" },
        { value: "Não", label: "Nao" },
      ],
    },
    {
      accessorKey: "alumniDreamer" as Path<T>,
      header: "Alumni Dreamer",
      type: "select",
      options: [
        { value: "Sim", label: "Sim" },
        { value: "Não", label: "Não" },
      ],
    },
  ];

  const exFields: FieldConfig<T>[] = [
    { accessorKey: "semesterLeaveEj" as Path<T>, header: "Semestre de Saída" },
    { accessorKey: "aboutEj" as Path<T>, header: "Experiência na EJ" },

    {
      accessorKey: "isWorking" as Path<T>,
      header: "Está trabalhando?",
      type: "select",
      options: [
        { value: "Sim", label: "Sim" },
        { value: "Não", label: "Não" },
      ],
    },

    ...(isWorking
      ? [
          {
            accessorKey: "workplace" as Path<T>,
            header: "Local de Trabalho",
          },
        ]
      : []),
    ...(selectedRoles.includes(process.env.OTHER_ROLE_ID as string)
      ? [{ accessorKey: "otherRole" as Path<T>, header: "Outro Cargo" }]
      : []),
  ];

  const filteredCommonFields = isExMember
    ? commonFields.filter((field) => field.accessorKey !== "roleId")
    : commonFields;

  return isExMember
    ? [...filteredCommonFields, ...exFields]
    : [...filteredCommonFields];
};

export const handleFileAccepted = (
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>
) => {
  // Define o progresso para 1 imediatamente para acionar a UI de loading.
  setUploadProgress(1);
  const interval = setInterval(() => {
    setUploadProgress((prev) => {
      if (prev >= 95) {
        clearInterval(interval);
        return 100;
      }
      return prev + 10;
    });
  }, 200);
};

export function parseBrazilianDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== "string") {
    return null;
  }

  const parts = dateString.split("/");
  if (parts.length !== 3) {
    return null;
  }
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // O mês no JS é 0-indexado (0-11)
  const year = parseInt(parts[2], 10);

  // Verifica se as partes são números válidos
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  // Cria a data com UTC para evitar problemas de fuso horário
  const date = new Date(Date.UTC(year, month - 1, day));

  // Validação final para datas inválidas como "32/10/2002"
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

// Define a estrutura para as regras de permissão que a função irá receber.
export interface PermissionCheck {
  allowedAreas?: AreaRoles[];
  allowedRoles?: string[];
  allowExMembers?: boolean;
}

/**
 * Função reutilizável para verificar se um utilizador tem permissão
 * com base nas suas áreas de atuação ou cargos específicos.
 *
 * @param user - O objeto do utilizador, que deve incluir a sua lista de cargos.
 * @param permissions - Um objeto que define as regras de permissão.
 * @returns `true` se o utilizador tiver permissão, `false` caso contrário.

*/
export const checkUserPermission = (
  user: (User & { roles: Role[]; currentRole?: Role | null }) | null,
  permissions: PermissionCheck
): boolean => {
  // 1. Se não houver utilizador, não há permissão.
  if (!user) {
    return false;
  }

  // 2. Trata os ex-membros como um caso separado e exclusivo.
  if (user.isExMember) {
    return permissions.allowExMembers === true;
  }

  // 3. A partir daqui, estamos a lidar apenas com membros ATIVOS.

  // Verifica se a permissão exige cargos ou áreas específicas.
  const hasSpecificRules =
    (permissions.allowedRoles && permissions.allowedRoles.length > 0) ||
    (permissions.allowedAreas && permissions.allowedAreas.length > 0);

  // Se NÃO houver regras específicas, a permissão é concedida a qualquer membro ativo.
  // Isto faz com que `MEMBERS_ONLY` funcione corretamente.
  if (!hasSpecificRules) {
    return true;
  }

  // Se HOUVER regras específicas, verifica se o cargo ATUAL do utilizador as cumpre.
  // Se o utilizador não tiver um cargo atual, ele não pode ter permissões específicas.
  if (!user.currentRole) {
    return false;
  }

  // Verifica a permissão com base nos cargos permitidos ('allowedRoles')
  if (permissions.allowedRoles && permissions.allowedRoles.length > 0) {
    const allowedRoleNames = permissions.allowedRoles.map((r) => r);
    if (allowedRoleNames.includes(user.currentRole.name)) {
      return true; // Permissão concedida pelo cargo atual
    }
  }

  // Verifica a permissão com base nas áreas permitidas ('allowedAreas')
  if (permissions.allowedAreas && permissions.allowedAreas.length > 0) {
    if (
      user.currentRole.area.some((area) =>
        permissions.allowedAreas!.includes(area)
      )
    ) {
      return true; // Permissão concedida pela área do cargo atual
    }
  }

  // 4. Se o utilizador for um membro ativo mas o seu cargo atual não cumprir
  // nenhuma das regras específicas, a permissão é negada.
  return false;
};

export const getInitials = (name: string | undefined) => {
  if (!name) return "";
  const names = name.split(" ");
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const getPhrasePercentageByGoal = (value: number, goal: number) => {
  const phrases = [
    "Tamo começando!",
    "Vamo arder",
    "Tamo ardendo!",
    "Tá quase lá!",
    "Meta ALCANÇADA",
  ];

  // Evita a divisão por zero se a meta for 0
  if (goal === 0) {
    return value > 0 ? phrases[3] : phrases[0];
  }

  // Calcula a percentagem como um valor de 0 a 100
  const percentage = (value / goal) * 100;

  // Verifica a percentagem de cima para baixo para retornar a frase correta
  if (percentage >= 100) {
    return phrases[4];
  }
  if (percentage >= 75) {
    return phrases[3];
  }
  if (percentage >= 50) {
    return phrases[2];
  }
  if (percentage >= 25) {
    return phrases[1];
  }
  // Se for menor que 25%, retorna a primeira frase
  return phrases[0];
};
export const fileToBase64 = (
  file: File
): Promise<{ mimeType: string; base64: string }> => {
  // Usamos uma Promise porque a leitura de um arquivo é uma operação assíncrona.
  return new Promise((resolve, reject) => {
    // 1. Cria uma instância do FileReader, a API do navegador para ler arquivos.
    const reader = new FileReader();

    // 2. Inicia a leitura do arquivo. O resultado será um "Data URL".
    reader.readAsDataURL(file);

    // 3. Define o que acontece quando a leitura for concluída com sucesso.
    reader.onload = () => {
      // O resultado é uma string completa, ex: "data:image/png;base64,iVBORw0KGgo..."
      const result = reader.result as string;

      // 4. Nós só queremos a parte do base64, então dividimos a string na vírgula
      //    e pegamos a segunda parte.
      const base64 = result.split(",")[1];

      // 5. A Promise é resolvida com os dados que a API do Gemini precisa.
      resolve({ mimeType: file.type, base64 });
    };

    // 6. Define o que acontece se houver um erro durante a leitura.
    reader.onerror = (error) => reject(error);
  });
};

export const getLabelForLinkArea = (area: LinkAreas): string => {
  const labels: Record<LinkAreas, string> = {
    GERAL: "Geral",
    CONSULTORIA: "Consultoria",
    DIRETORIA: "Diretoria",
    TATICO: "Tático",
    PRESIDENCIA: "Presidência",
    OPERACOES: "Operações",
    PESSOAS: "Gestão de Pessoas",
    PROJETOS: "Projetos",
    MERCADO: "Mercado",
  };
  return labels[area] || area;
};

export const getPermissionForRoute = (
  path: string,
  permissions: Record<string, PermissionCheck>
): PermissionCheck | null => {
  let currentPath = path;
  while (currentPath !== "/") {
    if (permissions[currentPath]) {
      return permissions[currentPath];
    }
    currentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
    if (currentPath === "") {
      currentPath = "/";
    }
  }
  return permissions["/"] || null;
};

export const verifyAccess = ({
  pathname,
  user,
}: {
  pathname: string;
  user: FullUser | MemberWithFullRoles;
}) => {
  const requiredPermission = getPermissionForRoute(pathname, ROUTE_PERMISSIONS);
  if (requiredPermission) {
    return checkUserPermission(user, requiredPermission);
  }
  return false;
};

export function exportToExcel<T>(data: T[], fileName: string) {
  // Converte o array de objetos para uma planilha do Excel
  const worksheet = XLSX.utils.json_to_sheet(data);
  // Cria um novo "livro" de planilhas
  const workbook = XLSX.utils.book_new();
  // Adiciona a planilha ao livro
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
  // Gera o arquivo e aciona o download no navegador
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Extrai as palavras mais relevantes de um texto, ignorando palavras comuns.
 * @param text O texto de entrada.
 * @param count O número de palavras a serem retornadas.
 * @returns Um array com as palavras mais relevantes.
 */
export function getSimilarWords(text: string, count: number): string[] {
  // Lista de 'stop words' em português (palavras comuns a serem ignoradas)
  const stopWords = new Set(['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua']);
  
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .split(/\s+/) // Divide em palavras
    .filter(word => word.length > 3 && !stopWords.has(word)) // Filtra palavras curtas e stop words
    .slice(0, count); // Pega as primeiras 'count' palavras
}

export const defaultEmojis: { emoji: string; name: string }[] = [
  { emoji: "😂", name: "rindo até chorar" },
  { emoji: "❤️", name: "coração vermelho" },
  { emoji: "🤣", name: "rolando de rir" },
  { emoji: "👍", name: "joinha" },
  { emoji: "😭", name: "chorando muito" },
  { emoji: "🙏", name: "mãos em oração" },
  { emoji: "😘", name: "beijo com coração" },
  { emoji: "🥰", name: "rosto apaixonado" },
  { emoji: "😍", name: "olhos de coração" },
  { emoji: "😊", name: "sorriso tímido" },
  { emoji: "🎉", name: "confete festa" },
  { emoji: "😁", name: "sorriso largo" },
  { emoji: "💕", name: "dois corações" },
  { emoji: "🥺", name: "olhos de cachorrinho" },
  { emoji: "😅", name: "sorriso suado" },
  { emoji: "🔥", name: "fogo" },
  { emoji: "☺️", name: "sorriso calmo" },
  { emoji: "🤦", name: "facepalm" },
  { emoji: "👏", name: "palmas" },
  { emoji: "💔", name: "coração partido" },
  { emoji: "💖", name: "coração brilhante" },
  { emoji: "💙", name: "coração azul" },
  { emoji: "😆", name: "risada forte" },
  { emoji: "😢", name: "triste chorando" },
  { emoji: "✨", name: "brilhos" },
  { emoji: "😎", name: "rosto de óculos escuros" },
  { emoji: "🤔", name: "pensativo" },
  { emoji: "😔", name: "triste pensativo" },
  { emoji: "😏", name: "sorriso de canto" },
  { emoji: "😉", name: "piscadinha" },
  { emoji: "🙂", name: "sorriso simples" },
  { emoji: "🙃", name: "de cabeça para baixo" },
  { emoji: "🤗", name: "abraço" },
  { emoji: "🤩", name: "estrelas nos olhos" },
  { emoji: "😳", name: "envergonhado" },
  { emoji: "🤭", name: "ops, mão na boca" },
  { emoji: "😱", name: "grito de medo" },
  { emoji: "😴", name: "dormindo" },
  { emoji: "🤤", name: "baba" },
  { emoji: "😋", name: "delícia" },
  { emoji: "😜", name: "língua de fora piscando" },
  { emoji: "😒", name: "entediado" },
  { emoji: "🙄", name: "revirando os olhos" },
  { emoji: "😡", name: "raiva" },
  { emoji: "🤬", name: "xingando" },
  { emoji: "🤯", name: "cabeça explodindo" },
  { emoji: "😇", name: "anjo" },
  { emoji: "🥳", name: "festa animada" },
  { emoji: "😷", name: "máscara médica" },
  { emoji: "💪", name: "músculo forte" },
  { emoji: "🌹", name: "rosa" },
  { emoji: "😻", name: "gato apaixonado" },
  { emoji: "🙈", name: "macaco cobrindo olhos" },
  { emoji: "🙉", name: "macaco cobrindo ouvidos" },
  { emoji: "🙊", name: "macaco cobrindo boca" },
  { emoji: "🎶", name: "notas musicais" },
  { emoji: "💃", name: "dançarina" },
  { emoji: "🕺", name: "dançarino" },
  { emoji: "🌞", name: "sol sorridente" },
  { emoji: "🌙", name: "lua crescente" },
  { emoji: "⭐", name: "estrela" },
  { emoji: "⚡", name: "raio" },
  { emoji: "☀️", name: "sol" },
  { emoji: "🌈", name: "arco-íris" },
  { emoji: "☁️", name: "nuvem" },
  { emoji: "☔", name: "guarda-chuva chuva" },
  { emoji: "🌊", name: "onda" },
  { emoji: "🍕", name: "pizza" },
  { emoji: "🍔", name: "hambúrguer" },
  { emoji: "🍟", name: "batata frita" },
  { emoji: "🍩", name: "rosquinha" },
  { emoji: "🍎", name: "maçã" },
  { emoji: "🍓", name: "morango" },
  { emoji: "🍌", name: "banana" },
  { emoji: "🍇", name: "uvas" },
  { emoji: "🍒", name: "cerejas" },
  { emoji: "🍑", name: "pêssego" },
  { emoji: "🥑", name: "abacate" },
  { emoji: "🌽", name: "milho" },
  { emoji: "🍫", name: "chocolate" },
  { emoji: "🍺", name: "cerveja" },
  { emoji: "🍷", name: "taça de vinho" },
  { emoji: "🥂", name: "brinde" },
  { emoji: "☕", name: "café" },
  { emoji: "🥤", name: "refrigerante" },
  { emoji: "🍹", name: "coquetel" },
  { emoji: "⚽", name: "bola de futebol" },
  { emoji: "🏀", name: "bola de basquete" },
  { emoji: "🏈", name: "bola de futebol americano" },
  { emoji: "⚾", name: "bola de beisebol" },
  { emoji: "🎾", name: "raquete tênis" },
  { emoji: "🏐", name: "bola de vôlei" },
  { emoji: "🎮", name: "videogame" },
  { emoji: "🎲", name: "dado" },
  { emoji: "♟️", name: "peão de xadrez" },
  { emoji: "🚗", name: "carro" },
  { emoji: "🚕", name: "táxi" },
  { emoji: "🚙", name: "SUV" },
  { emoji: "🚌", name: "ônibus" },
  { emoji: "🚎", name: "bonde" },
  { emoji: "🏎️", name: "carro de corrida" },
  { emoji: "🚓", name: "carro de polícia" },
  { emoji: "🚑", name: "ambulância" },
  { emoji: "🚒", name: "caminhão de bombeiros" }
];

export function getLabelForRoleArea(area: AreaRoles): string {
  const labels: Record<AreaRoles, string> = {
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
  };
  return labels[area] || area;
}

export function getUserStatus(lastActiveAt: Date | null) {
  if (!lastActiveAt) return { isOnline: false, label: "Nunca acessou" };

  const activeThresholdInMinutes = 5;
  const now = new Date();
  const diffInMinutes = (now.getTime() - new Date(lastActiveAt).getTime()) / (1000 * 60);

  if (diffInMinutes <= activeThresholdInMinutes) {
    return { isOnline: true, label: "Online" };
  }

  // Se passou de 5 minutos, formatamos o "Visto por último"
  // Você pode usar a lib 'date-fns' para formatar (ex: "há 2 horas")
  return { 
    isOnline: false, 
    label: `${formatDistanceToNow(new Date(lastActiveAt), { addSuffix: true, locale: ptBR })}` 
  };
}
