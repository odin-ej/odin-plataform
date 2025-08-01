import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Role, AreaRoles, LinkAreas, User } from "@prisma/client";
import { UserProfileValues } from "./schemas/memberFormSchema";
import { ExMemberType } from "./schemas/exMemberFormSchema";
import { FieldConfig } from "@/app/_components/Global/Custom/CustomModal";
import { Path } from "react-hook-form";
import { ROUTE_PERMISSIONS } from "./permissions";

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
  user: (User & { roles: Role[]; currentRole?: Role }) | null,
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
  // Usamos uma Promise porque a leitura de um ficheiro é uma operação assíncrona.
  return new Promise((resolve, reject) => {
    // 1. Cria uma instância do FileReader, a API do navegador para ler ficheiros.
    const reader = new FileReader();

    // 2. Inicia a leitura do ficheiro. O resultado será um "Data URL".
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
  user: User & { roles: Role[]; currentRole?: Role };
}) => {
  const requiredPermission = getPermissionForRoute(pathname, ROUTE_PERMISSIONS);
  if (requiredPermission) {
    return checkUserPermission(user, requiredPermission);
  }
  return false;
};
