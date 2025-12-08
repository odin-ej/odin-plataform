/* eslint-disable @typescript-eslint/no-explicit-any */

import { AreaInovationInitiative, InovationInitiativeStatus, InovationInitiativeType, SubAreaInovationInitiative } from "@prisma/client";

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

  // console.log("A semear cargos...");
  // await prisma.role.deleteMany(); // Limpa os cargos existentes para evitar duplicados
  // await prisma.role.createMany({
  //   data: cargos.map((cargo) => ({
  //     name: cargo.name,
  //     description: `Descrição para o cargo de ${cargo.name}`,
  //     area: cargo.area,
  //   })),
  //   skipDuplicates: true,
  // });
  // console.log("Cargos semeados com sucesso.");

  // // 2. Seed do Plano Estratégico, Valores, Objetivos e Metas
  // console.log("A semear o Plano Estratégico...");
  // // Usamos upsert para criar ou atualizar o plano estratégico, garantindo que ele seja único.
  // await prisma.estrategyPlan.upsert({
  //   where: { id: 1 },
  //   update: {}, // Não faz nada se já existir
  //   create: {
  //     id: 1,
  //     propose: proposito,
  //     mission: mission,
  //     vision: vision,
  //     values: {
  //       create: valores.map((valor) => ({
  //         name: valor.name,
  //         description: valor.description,
  //         isMotherValue: valor.isMotherValue || false,
  //       })),
  //     },
  //     estrategyObjectives: {
  //       create: objetivosEstrategicos.map((obj) => ({
  //         objective: obj.objective,
  //         description: obj.description,
  //         goals: {
  //           create: obj.goals.map((goal) => ({
  //             title: goal.title,
  //             description: goal.description,
  //             goal: goal.goal,
  //             value: goal.value,
  //           })),
  //         },
  //       })),
  //     },
  //   },
  // });

  // console.log(
  //   "Plano Estratégico, Valores, Objetivos e Metas semeados com sucesso."
  // );

  // await prisma.room.createMany({
  //   data: [{ name: "Talentos" }, { name: "Comitê" }],
  // });

  // const diretorRole = await prisma.role.findUnique({
  //   where: { name: "Diretor(a) Presidente" },
  // });

  // if (!diretorRole) {
  //   console.error(
  //     'O cargo "Diretor(a) Presidente" não foi encontrado. A seed não pode continuar.'
  //   );
  //   return;
  // }

  // const adminEmail = "plataforma@empresajr.org";
  // const adminPassword = "Plataformaodin123@"; // Use uma senha segura nas suas variáveis de ambiente

  // // Faz o hash da senha
  // let cognitoUserSub: string | undefined;

  // try {
  //   // Verifica se o utilizador já existe no Cognito
  //   const existingCognitoUser = await cognitoClient.send(
  //     new AdminGetUserCommand({
  //       UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
  //       Username: adminEmail,
  //     })
  //   );
  //   cognitoUserSub = existingCognitoUser.UserAttributes?.find(
  //     (attr: { Name: string }) => attr.Name === "sub"
  //   )?.Value;
  //   console.log(`Utilizador já existe no Cognito: ${adminEmail}`);
  // } catch (error: any) {
  //   if (error.name === "UserNotFoundException") {
  //     // Se o utilizador não existe, cria-o no Cognito
  //     console.log(`Utilizador não encontrado no Cognito. A criar...`);
  //     const createCognitoUserResponse = await cognitoClient.send(
  //       new AdminCreateUserCommand({
  //         UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
  //         Username: adminEmail,
  //         UserAttributes: [
  //           { Name: "email", Value: adminEmail },
  //           { Name: "name", Value: "Admin Odin" },
  //           { Name: "email_verified", Value: "true" },
  //         ],
  //         MessageAction: "SUPPRESS",
  //       })
  //     );

  //     cognitoUserSub = createCognitoUserResponse.User?.Attributes?.find(
  //       (attr: { Name: string }) => attr.Name === "sub"
  //     )?.Value;

  //     // Define a senha do novo utilizador como permanente
  //     await cognitoClient.send(
  //       new AdminSetUserPasswordCommand({
  //         UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
  //         Username: adminEmail,
  //         Password: adminPassword,
  //         Permanent: true,
  //       })
  //     );
  //     console.log(`Utilizador criado no Cognito com sucesso: ${adminEmail}`);
  //   } else {
  //     throw error; // Lança outros erros do Cognito
  //   }
  // }

  // if (!cognitoUserSub) {
  //   console.error(
  //     "Não foi possível obter o ID (sub) do utilizador do Cognito."
  //   );
  //   return;
  // }

  // // Faz o hash da senha para guardar no Prisma
  // const hashedPassword4 = await bcrypt.hash(adminPassword, 10);

  // // Usa 'upsert' para criar o utilizador no Prisma se ele não existir
  // await prisma.user.upsert({
  //   where: { email: adminEmail },
  //   update: {},
  //   create: {
  //     id: cognitoUserSub, // Usa o ID do Cognito como ID no Prisma
  //     name: "Admin Odin",
  //     email: adminEmail,
  //     emailEJ: "plataforma@empresajr.org",
  //     password: hashedPassword4,
  //     birthDate: new Date(),
  //     phone: "(00) 00000-0000",
  //     imageUrl: "https://placehold.co/100x100/0126fb/f5b719?text=AD",
  //     semesterEntryEj: "2024.1",
  //     isExMember: false,
  //     alumniDreamer: false,
  //     currentRole: { connect: { id: diretorRole.id } },
  //     roles: { connect: { id: diretorRole.id } },
  //   },
  // });
  // const gestao = await prisma.interestCategory.create({
  //   data: { name: "Gestão & Estratégia" },
  // });
  // const tech = await prisma.interestCategory.create({
  //   data: { name: "Tecnologia & Dados" },
  // });

  // // Depois, criar os interesses, associando-os a uma categoria
  // await prisma.professionalInterest.createMany({
  //   data: [
  //     { name: "Gestão de Projetos (Agile, Scrum)", categoryId: gestao.id },
  //     { name: "Consultoria Estratégica", categoryId: gestao.id },

  //     { name: "Análise de Dados (Business Intelligence)", categoryId: tech.id },
  //     { name: "Desenvolvimento de Software", categoryId: tech.id },
  //     { name: "Design de Produto (UX/UI)", categoryId: tech.id },
  //     // ... e assim por diante
  //   ],
  // });

  //   const semesters = [];

  // const deletedSemester = await prisma.semester.deleteMany({})
  // if(deletedSemester.length > 1) console.log('Semestres deletados')

  // for (let year = 1989; year <= 2025; year++) {
  //   // Primeiro semestre (1º de janeiro a 30 de junho)
  //   semesters.push({
  //     name: `${year}.1`,
  //     startDate: new Date(year, 0, 1),   // 01/jan
  //     endDate: new Date(year, 5, 30),    // 30/jun
  //     isActive: false,
  //   });

  //   // Segundo semestre (1º de julho a 31 de dezembro)
  //   // Obs: como você pediu só até 2025.1, não criaremos o 2025.2
  //   if (year < 2025) {
  //     semesters.push({
  //       name: `${year}.2`,
  //       startDate: new Date(year, 6, 1),   // 01/jul
  //       endDate: new Date(year, 11, 31),   // 31/dez
  //       isActive: false,
  //     });
  //   }
  // }

  // // Upsert para não duplicar caso já exista
  // for (const semester of semesters) {
  //   await prisma.semester.upsert({
  //     where: { name: semester.name },
  //     update: {},
  //     create: semester,
  //   });
  // }

  // console.log(`✅ Criados/atualizados ${semesters.length} semestres`);

  // 1. BUSCAR OU CRIAR SEMESTRE 2025.2
  // Tenta achar o que você disse que já tem, senão cria um fallback
  let semester = await prisma.semester.findUnique({
    where: { name: '2025.2' }
  })

  if (!semester) {
    console.log('⚠️ Semestre 2025.2 não encontrado. Criando um para teste...')
    semester = await prisma.semester.create({
      data: {
        name: '2025.2',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-12-31'),
        isActive: true,
      }
    })
  }

  // 2. BUSCAR OU CRIAR UM USUÁRIO AUTOR (ADMIN ODIN)
  // Precisamos de um ID válido para o campo authorId
  const userEmail = 'plataforma@empresajr.org'
  let author = await prisma.user.findUnique({
    where: { email: userEmail }
  })

  if (!author) {
    console.log('👤 Criando usuário autor Mock...')
    author = await prisma.user.create({
      data: {
        id: 'user-admin-odin-01',
        name: 'Admin Odin',
        email: userEmail,
        emailEJ: 'odin@empresajr.com',
        phone: '99999999999',
        password: 'hash-password-placeholder', // Em produção use bcrypt
        imageUrl: 'https://github.com/shadcn.png',
        semesterEntryEj: '2023.1',
        birthDate: new Date('2000-01-01'),
      }
    })
  }

  console.log('🧹 Limpando iniciativas antigas de teste (opcional)...')
  // Opcional: deletar iniciativas criadas anteriormente para não duplicar
 await prisma.initiativeRelation.deleteMany({})

  // 2. SEGUNDO: Deletar os Links (Embora tenha Cascade no schema, é seguro garantir)
  // Se o Cascade do banco estiver funcionando, isso é opcional, mas evita erros se o DB estiver desatualizado
  await prisma.link.deleteMany({
    where: {
      initiative: {
        semesterId: semester.id
      }
    }
  })

  // 3. TERCEIRO: Agora sim podemos deletar as Iniciativas
  await prisma.inovationInitiative.deleteMany({
    where: { semesterId: semester.id }
  })

  // 3. CRIAR INICIATIVAS

  // --- ITEM 1: EVENTO (InovaDay) ---
  const inovaDay = await prisma.inovationInitiative.create({
    data: {
      title: 'InovaDay 2025.2',
      type: InovationInitiativeType.Evento,
      status: InovationInitiativeStatus.RUNNING,
      shortDescription: 'Imersão completa da empresa em metodologias ágeis e design thinking.',
      description: 'Um dia inteiro focado em destravar a criatividade dos membros através de dinâmicas de grupo e palestras com ex-membros. O evento contou com a participação de 100% da empresa.',
      isFixed: true,
      isRunning: true,
      semesterId: semester.id,
      authorId: author.id,
      dateImplemented: new Date('2025-10-10'),
      tags: ['Inovação', 'Cultura', 'Agile', 'Imersão'],
      areas: [AreaInovationInitiative.Geral, AreaInovationInitiative.Pessoas],
      subAreas: [SubAreaInovationInitiative.Eventos, SubAreaInovationInitiative.Inovação],
      // Método S.O.C.I.O
      sentido: 'Fazer a empresa subir mais um degrau em seu crescimento como organização - EVOLUÇÃO.',
      organizacao: 'Integração de todas as áreas em um propósito único de inovação.',
      cultura: 'Entusiasmo dos membros em participar ativamente da construção do futuro.',
      influencia: 'Aumentar a retenção de membros através do senso de pertencimento.',
      operacao: 'Geração de 15 novas ideias de melhoria de processos.',
      // Links
      links: {
        create: [
          { label: 'Álbum de Fotos', url: 'https://photos.google.com' },
          { label: 'Miro Board', url: 'https://miro.com' }
        ]
      }
    }
  })

  // --- ITEM 2: PÍLULA (Power BI) ---
  const pilulaBI = await prisma.inovationInitiative.create({
    data: {
      title: 'Pílula: Power BI Avançado',
      type: InovationInitiativeType.Pilula,
      status: InovationInitiativeStatus.APPROVED,
      shortDescription: 'Capacitação rápida de 30min sobre DAX e visualização de dados.',
      description: 'Apresentação realizada durante a Reunião Geral para nivelar o conhecimento em dados da diretoria de projetos e mercado.',
      semesterId: semester.id,
      authorId: author.id,
      dateImplemented: new Date('2025-09-15'),
      tags: ['Dados', 'Performance', 'BI'],
      areas: [AreaInovationInitiative.Projetos, AreaInovationInitiative.Mercado],
      subAreas: [SubAreaInovationInitiative.Performance],
      sentido: 'Melhorar a qualidade das entregas finais para o cliente através de dados visuais.',
      links: {
        create: [
          { label: 'Slide Deck (Canva)', url: 'https://canva.com' }
        ]
      }
    }
  })

  // --- ITEM 3: NÚCLEO (Plataforma Odin) ---
  const nucleoOdin = await prisma.inovationInitiative.create({
    data: {
      title: 'Plataforma Odin',
      type: InovationInitiativeType.Nucleo,
      status: InovationInitiativeStatus.RUNNING,
      shortDescription: 'Centralização de toda a gestão da EJ em um único sistema proprietário.',
      description: 'Plataforma interna para gestão de metas, reservas, cultura e inovação. Substitui diversas planilhas e centraliza a informação.',
      isFixed: true, // Itens do núcleo costumam ser fixos
      semesterId: semester.id,
      authorId: author.id,
      dateImplemented: new Date('2025-07-01'),
      tags: ['Tecnologia', 'Programação', 'Next.js', 'Gestão'],
      areas: [AreaInovationInitiative.Geral],
      subAreas: [SubAreaInovationInitiative.Inovação],
      // Método S.O.C.I.O
      sentido: 'Transformação digital completa da operação da EJ.',
      organizacao: 'Eliminação de 15 planilhas de controle paralelas e redução de ruído na comunicação.',
      cultura: 'Cultura Data-Driven estabelecida e orgulho de ter um sistema próprio.',
      operacao: 'Automação de reservas e reports semanais.',
      links: {
        create: [
          { label: 'Acessar Odin', url: 'https://odin.sistema.com' },
          { label: 'Repositório GitHub', url: 'https://github.com' }
        ]
      }
    }
  })

  // --- ITEM 4: INICIATIVA GERAL (Consultoria de Processos) ---
  const iniciativaProcessos = await prisma.inovationInitiative.create({
    data: {
      title: 'Nova Metodologia de Vendas',
      type: InovationInitiativeType.Iniciativa,
      status: InovationInitiativeStatus.PENDING,
      shortDescription: 'Implementação do SPIN Selling no processo de negociação.',
      description: 'Mudança no script de vendas para focar nas dores do cliente utilizando a metodologia SPIN.',
      semesterId: semester.id,
      authorId: author.id,
      dateImplemented: new Date('2025-11-20'),
      tags: ['Vendas', 'Comercial', 'Metodologia'],
      areas: [AreaInovationInitiative.Mercado],
      subAreas: [SubAreaInovationInitiative.Comercial],
      sentido: 'Aumentar a taxa de conversão de leads em projetos fechados.'
    }
  })

  // 4. CRIAR RELACIONAMENTOS (InitiativeRelation)
  // Exemplo: O InovaDay (Evento) apresentou a Plataforma Odin (Núcleo)
  
  console.log('🔗 Criando relacionamentos entre iniciativas...')
  
  await prisma.initiativeRelation.create({
    data: {
      fromId: inovaDay.id,
      toId: nucleoOdin.id
    }
  })

  console.log('✅ Seed concluído com sucesso!')

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
