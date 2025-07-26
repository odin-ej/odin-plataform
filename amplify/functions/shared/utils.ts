/* eslint-disable @typescript-eslint/no-explicit-any */
import { Role, AreaRoles, User } from ".prisma/client";


export function createResponse(statusCode: number, body: object | null) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: body ? JSON.stringify(body) : '',
  };
}

export const normalizeString = (str: string) => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dateObj = new Date(date);
  
 if (isNaN(dateObj.getTime())) return "";

  // getUTCDate garante que não haverá problemas com fuso horário
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
  const year = dateObj.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

export function orderRolesByHiearchy(roles: Role[]) {
  const areaOrder = [
    AreaRoles.PRESIDENCIA,
    AreaRoles.DIRETORIA,
    AreaRoles.CONSELHO,
    AreaRoles.TATICO,
    AreaRoles.OPERACOES,
    AreaRoles.PROJETOS,
    AreaRoles.MERCADO,
    AreaRoles.PESSOAS,
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

export function getFriendlyErrorMessage(error: any): string {
  // Erros do AWS Cognito
  if (error.name === "UsernameExistsException") {
    return "Este e-mail já está a ser utilizado por outro membro no Cognito.";
  }
  if (error.name === "InvalidPasswordException") {
    return "A senha não cumpre os requisitos de segurança (mín. 8 caracteres, com maiúsculas, minúsculas, números e símbolos).";
  }

  // Erros do Prisma (violação de restrição única)
  if (error.code === "P2002") {
    const target = error.meta?.target as string[] | undefined;
    if (target?.includes("email")) {
      return "O e-mail pessoal fornecido já está em uso por outro membro.";
    }
    if (target?.includes("emailEJ")) {
      return "O e-mail EJ fornecido já está em uso por outro membro.";
    }
    if (target?.includes("phone")) {
      return "O número de telefone fornecido já está em uso por outro membro.";
    }
    // Mensagem genérica para outras violações de @unique
    return `O campo '${target?.join(", ")}' já está em uso.`;
  }

  // Erros de relação do Prisma
  if (error.code === "P2025") {
    return "Erro de relação: Um ou mais cargos a serem conectados não foram encontrados na base de dados.";
  }

  // Mensagem padrão para outros erros
  return (
    error.message || "Ocorreu um erro desconhecido durante o processamento."
  );
}


export function parseBrazilianDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const parts = dateString.split('/');
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
  user: User & { roles: Role[] } | null,
  permissions: PermissionCheck
): boolean => {
  // Se não houver utilizador, não há permissão.
  if (!user) {
    return false;
  }

  // Se a regra permitir ex-membros e o utilizador for um, concede permissão.
  if (permissions.allowExMembers && user.isExMember) {
    return true;
  }

  // Verifica se alguma das áreas de atuação do utilizador está na lista de áreas permitidas.
  if (permissions.allowedAreas && permissions.allowedAreas.length > 0) {
    const hasAllowedArea = user.roles.some((role: { area: any[]; }) =>
      role.area.some((area: any) => permissions.allowedAreas!.includes(area))
    );
    if (hasAllowedArea) {
      return true;
    }
  }

  // Verifica se algum dos nomes dos cargos do utilizador está na lista de cargos permitidos.
  if (permissions.allowedRoles && permissions.allowedRoles.length > 0) {
    const hasAllowedRole = user.roles.some((role: { name: string; }) =>
      permissions.allowedRoles!.includes(role.name)
    );
    if (hasAllowedRole) {
      return true;
    }
  }

  // Se nenhuma das condições for satisfeita, o utilizador não tem permissão.
  return false;
};

export const getInitials = (name: string | undefined) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

export const getPhrasePercentageByGoal = (value: number, goal: number) => {
  const phrases = [
    'Tamo começando!',
    'Vamo arder',
    'Tá quase lá!',
    'Meta ALCANÇADA'
  ]
    const percentage = value / goal;

  const phraseIndex = Math.floor(percentage / (100 / phrases.length));
  return phrases[phraseIndex];
}
export const fileToBase64 = (file: File): Promise<{ mimeType: string; base64: string }> => {
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
      const base64 = result.split(',')[1];

      // 5. A Promise é resolvida com os dados que a API do Gemini precisa.
      resolve({ mimeType: file.type, base64 });
    };

    // 6. Define o que acontece se houver um erro durante a leitura.
    reader.onerror = error => reject(error);
  });
};

