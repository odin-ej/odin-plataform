/* eslint-disable @typescript-eslint/no-explicit-any */

const {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} = require("@aws-sdk/client-cognito-identity-provider");
const { AreaRoles, PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const hash = require("bcrypt");

const prisma = new PrismaClient();

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

// Dados fornecidos por si
const cargos = [
  { name: "Consultor(a)", description: "", area: [AreaRoles.CONSULTORIA] },
  {
    name: "Liderança do Comitê",
    description: "",
    area: [AreaRoles.CONSULTORIA],
  },
  {
    name: "Assessor(a) de Captação",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.PESSOAS],
  },
  {
    name: "Assessor(a) de Conexões",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.PESSOAS],
  },
  {
    name: "Gerente de Produtos",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.OPERACOES],
  },
  {
    name: "Gerente Financeiro",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.OPERACOES],
  },
  {
    name: "Gerente de Desenvolvimento",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.OPERACOES],
  },
  {
    name: "Assessor(a) de Perfomance",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.PRESIDENCIA],
  },
  {
    name: "Assessor(a) de Relacionamento",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.PRESIDENCIA],
  },
  {
    name: "Gerente de Projetos",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.PROJETOS],
  },
  {
    name: "Head de Projetos",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.PROJETOS],
  },
  {
    name: "Customer Experience",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.MERCADO],
  },
  {
    name: "Gerente de Marketing de Estratégia",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.MERCADO],
  },
  {
    name: "Gerente de Marketing de Conteúdo",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.MERCADO],
  },
  {
    name: "Gerente Comercial",
    description: "",
    area: [AreaRoles.TATICO, AreaRoles.MERCADO],
  },
  {
    name: "Diretor(a) de Operações",
    description: "",
    area: [AreaRoles.DIRETORIA, AreaRoles.OPERACOES],
  },
  {
    name: "Diretor(a) Presidente",
    description: "",
    area: [AreaRoles.DIRETORIA, AreaRoles.PRESIDENCIA],
  },
  {
    name: "Diretor(a) de Gestão de Pessoas",
    description: "",
    area: [AreaRoles.DIRETORIA, AreaRoles.PESSOAS],
  },
  {
    name: "Diretor(a) de Mercado",
    description: "",
    area: [AreaRoles.DIRETORIA, AreaRoles.MERCADO],
  },
  {
    name: "Diretor(a) de Projetos",
    description: "",
    area: [AreaRoles.DIRETORIA, AreaRoles.PROJETOS],
  },
  { name: "Conselho", description: "", area: [AreaRoles.CONSELHO] },
  { name: "Outro", description: "", area: [AreaRoles.OUTRO] },
];

const valores = [
  {
    name: "Ser sócio",
    description:
      "Assumir a causa e propósito como nosso, comprometend-nos a contribuir continuamente com a Casinha e seus membros",
    isMotherValue: true,
  },
  {
    name: "Inquietação",
    description:
      "Espírito de inovação, questionamento e proatividade dentro da Casinha dos sonhos.",
  },
  {
    name: "Só faça",
    description:
      "Ser proativo, não arranjando desculpas para fazer qualquer atividade da Casinha.",
  },
  {
    name: "Envolvimento",
    description:
      "Compromisso genuíno de estar presente, apoiar e se engajar ativamente nas iniciativas da Casinha.",
  },
  {
    name: "Sintonia",
    description:
      "Essência da escuta ativa, da empatia e do alinhamento com a cultura organizacional.",
  },
  {
    name: "Singular",
    description:
      "Valorização das diferenças e o reconhecimento de que cada pessoa contribui de forma única.",
  },
  {
    name: "Donos de Sonhos",
    description:
      "Compromisso genuíno com o propóstio e a missão da Empresa JR ADM UFBA.",
  },
];

const proposito =
  "O nosso propósito é impactar na sociedade através de jovens comprometidos com a causa e com vontade de mudar a realidade do ecossistema empreendedor baiano e brasileiro.";
const mission =
  "Impactamos na sociedade, realizando os sonhos dos nossos clientes, por meio do desenvolvimento de lideranças empreendedoras plurais.";
const vision =
  "Construir um legado de sonhos, impulsionando lideranças protagonistas.";

const objetivosEstrategicos = [
  {
    objective: "Expandir a nossa história promovendo a inovação",
    description:
      "“Expandir a nossa história promovendo a inovação” significa valorizar nosso legado de conhecimento e conquistas enquanto cultivamos uma visão criativa para o futuro.",
    goals: [
      {
        title: "Faturamento",
        description:
          "Valor total obtido com as vendas de produotos e serviços na empresa em um determinado período, sem considerar os custos.",
        goal: 1300000,
        value: 523601,
      },
      {
        title: "Iniciativas inovadoras",
        description:
          "Quantidade de iniciativas inovadoras desenvolvidas pela empresa.",
        goal: 10,
        value: 5,
      },
    ],
  },
  {
    objective: "Potencializar os nossos sonhos",
    description:
      "“Potencializar os nossos sonhos” significa investir nas pessoas como o maior ativo da organização, criando um ambiente onde talentos diversos possam florescer e se desenvolver plenamente.",
    goals: [
      {
        title: "Vivência Empresarial",
        description:
          "O indicador assegura a equidade, garantindo que todos os membros tenham acesso às mesmas oportunidades de crescimento, e o impacto efetivo, promovendo resultados significativos na capacitação e engajamento de cada indivíduo dentro da organização.",
        goal: 1440,
        value: 840,
      },
      {
        title: "Sócio Multiplicador",
        description:
          "Motivar nossos sócios por meio da mobilização e participação em eventos do MEJ, promovendo reconhecimento, oportunidades de networking e experiências práticas que fortalecem sua vivência empresarial.",
        goal: 20,
        value: 10,
      },
    ],
  },
  {
    objective: "Impulsionar projetos de impacto no ecossistema",
    description:
      "Impulsionar projetos de impacto no ecossistema” é sobre criar soluções de consultoria que vão além da excelência técnica, entregando qualidade e resultados que transformem tanto os clientes quanto os membros envolvidos.",
    goals: [
      {
        title: "Projetos de impacto",
        description:
          "Esse indicador vai além de medir resultados financeiros e satisfação, pois reflete também o aprendizado e a evolução da empresa, alinhando impacto no mercado com crescimento interno sustentável.",
        goal: 10,
        value: 5,
      },
      {
        title: "Efeito donos de sonhos",
        description:
          "O indicador busca garantir que nossos projetos sejam executados com excelência, gerando resultados positivos tanto para os clientes quanto para a organização, promovendo aprendizado, crescimento e satisfação de todos os envolvidos.",
        goal: 10,
        value: 5,
      },
    ],
  },
];

async function main() {
  console.log("Iniciando o processo de seed...");

  console.log("A semear cargos...");
  await prisma.role.deleteMany(); // Limpa os cargos existentes para evitar duplicados
  await prisma.role.createMany({
    data: cargos.map((cargo) => ({
      name: cargo.name,
      description: `Descrição para o cargo de ${cargo.name}`,
      area: cargo.area,
    })),
    skipDuplicates: true,
  });
  console.log("Cargos semeados com sucesso.");

  // 2. Seed do Plano Estratégico, Valores, Objetivos e Metas
  console.log("A semear o Plano Estratégico...");
  // Usamos upsert para criar ou atualizar o plano estratégico, garantindo que ele seja único.
  await prisma.estrategyPlan.upsert({
    where: { id: 1 },
    update: {}, // Não faz nada se já existir
    create: {
      id: 1,
      propose: proposito,
      mission: mission,
      vision: vision,
      values: {
        create: valores.map((valor) => ({
          name: valor.name,
          description: valor.description,
          isMotherValue: valor.isMotherValue || false,
        })),
      },
      estrategyObjectives: {
        create: objetivosEstrategicos.map((obj) => ({
          objective: obj.objective,
          description: obj.description,
          goals: {
            create: obj.goals.map((goal) => ({
              title: goal.title,
              description: goal.description,
              goal: goal.goal,
              value: goal.value,
            })),
          },
        })),
      },
    },
  });

  console.log(
    "Plano Estratégico, Valores, Objetivos e Metas semeados com sucesso."
  );

  await prisma.room.createMany({
    data: [{ name: "Talentos" }, { name: "Comitê" }],
  });

  const diretorRole = await prisma.role.findUnique({
    where: { name: "Diretor(a) Presidente" },
  });

  if (!diretorRole) {
    console.error(
      'O cargo "Diretor(a) Presidente" não foi encontrado. A seed não pode continuar.'
    );
    return;
  }

  const adminEmail = "plataforma@empresajr.org";
  const adminPassword = "Plataformaodin123@"; // Use uma senha segura nas suas variáveis de ambiente

  // Faz o hash da senha
  let cognitoUserSub: string | undefined;

  try {
    // Verifica se o utilizador já existe no Cognito
    const existingCognitoUser = await cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
        Username: adminEmail,
      })
    );
    cognitoUserSub = existingCognitoUser.UserAttributes?.find(
      (attr: { Name: string }) => attr.Name === "sub"
    )?.Value;
    console.log(`Utilizador já existe no Cognito: ${adminEmail}`);
  } catch (error: any) {
    if (error.name === "UserNotFoundException") {
      // Se o utilizador não existe, cria-o no Cognito
      console.log(`Utilizador não encontrado no Cognito. A criar...`);
      const createCognitoUserResponse = await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
          Username: adminEmail,
          UserAttributes: [
            { Name: "email", Value: adminEmail },
            { Name: "name", Value: "Admin Odin" },
            { Name: "email_verified", Value: "true" },
          ],
          MessageAction: "SUPPRESS",
        })
      );

      cognitoUserSub = createCognitoUserResponse.User?.Attributes?.find(
        (attr: { Name: string }) => attr.Name === "sub"
      )?.Value;

      // Define a senha do novo utilizador como permanente
      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
          Username: adminEmail,
          Password: adminPassword,
          Permanent: true,
        })
      );
      console.log(`Utilizador criado no Cognito com sucesso: ${adminEmail}`);
    } else {
      throw error; // Lança outros erros do Cognito
    }
  }

  if (!cognitoUserSub) {
    console.error(
      "Não foi possível obter o ID (sub) do utilizador do Cognito."
    );
    return;
  }

  // Faz o hash da senha para guardar no Prisma
  const hashedPassword4 = await bcrypt.hash(adminPassword, 10);

  // Usa 'upsert' para criar o utilizador no Prisma se ele não existir
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      id: cognitoUserSub, // Usa o ID do Cognito como ID no Prisma
      name: "Admin Odin",
      email: adminEmail,
      emailEJ: "plataforma@empresajr.org",
      password: hashedPassword4,
      birthDate: new Date(),
      phone: "(00) 00000-0000",
      imageUrl: "https://placehold.co/100x100/0126fb/f5b719?text=AD",
      semesterEntryEj: "2024.1",
      isExMember: false,
      alumniDreamer: false,
      currentRole: { connect: { id: diretorRole.id } },
      roles: { connect: { id: diretorRole.id } },
    },
  });
  console.log("Seed concluído com sucesso!");

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
