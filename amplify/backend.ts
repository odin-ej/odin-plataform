import * as dotenv from "dotenv";
dotenv.config();
import { defineBackend } from "@aws-amplify/backend";
import { defineFunction } from "@aws-amplify/backend-function";
import { auth } from "./auth/resource";
import { Stack } from "aws-cdk-lib";
import {
  AuthorizationType,
  Cors,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";

const dbSecretsManagerAccessPolicyStatement = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["secretsmanager:GetSecretValue"],
  // Ex: arn:aws:secretsmanager:sa-east-1:SEU_ID_DA_CONTA:secret:minha-app/prod/database-url-xxxxxx
  resources: ["arn:aws:secretsmanager:sa-east-1:014164675859:secret:minha-app/prod/database-url-kRFIzM"],
});


// =================================================================
// 1. DEFINIÇÃO DO BACKEND E DE TODAS AS FUNÇÕES LAMBDA
// =================================================================

const commonLambdaEnvironment = {
  DATABASE_URL: process.env.DATABASE_URL!, // Para Lambdas que usam Prisma (lida por lib/db.ts)
  AWS_NODE_JS_CONNECTION_REUSE_ENABLED: "1",
  
  // Variáveis corrigidas para o ambiente da Lambda
  AWS_REGION: process.env.AWS_REGION!, // Pega do seu ambiente local (terminal)
  NODE_ENV: "production", // FORÇA explicitamente o ambiente como 'production' na Lambda

  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME!,
  AWS_S3_CHAT_BUCKET_NAME: process.env.AWS_S3_CHAT_BUCKET_NAME!,
  AWS_COGNITO_USER_POOL_ID: process.env.AWS_COGNITO_USER_POOL_ID!,
  AWS_COGNITO_USER_POOL_CLIENT_ID: process.env.AWS_COGNITO_USER_POOL_CLIENT_ID!,
  VERIFIED_EMAIL_FROM: process.env.VERIFIED_EMAIL_FROM!,
  MONDAY_API_KEY: process.env.MONDAY_API_KEY!,
  ALFA_BOARD: process.env.ALFA_BOARD!,
  BETA_BOARD: process.env.BETA_BOARD!,
  DELTA_BOARD: process.env.DELTA_BOARD!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY!,
  GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID!,
};

// --- Política IAM para Acesso ao Secrets Manager (DATABASE_URL) ---
// Substitua pelo ARN COMPLETO do seu segredo no Secrets Manager

const backend = defineBackend({
  auth,
  // Cultura & Estratégia
  getVision: defineFunction({
    name: "getVision",
    entry: "./functions/getVision/handler.ts",
    environment: commonLambdaEnvironment, // Passa vars de ambiente
  }),
  updateValue: defineFunction({
    name: "updateValue",
    entry: "./functions/updateValue/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  cultureHandler: defineFunction({
    name: "cultureHandler",
    entry: "./functions/cultureHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  // Metas e Objetivos
  getHouseGoals: defineFunction({
    name: "getHouseGoals",
    entry: "./functions/getHouseGoals/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  updateGoal: defineFunction({
    name: "updateGoal",
    entry: "./functions/updateGoal/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  updateObjective: defineFunction({
    name: "updateObjective",
    entry: "./functions/updateObjective/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  // Chat e Conversas
  conversationsHandler: defineFunction({
    name: "conversationsHandler",
    entry: "./functions/conversationsHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  getLatestConversation: defineFunction({
    name: "getLatestConversation",
    entry: "./functions/getLatestConversation/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  conversationByIdHandler: defineFunction({
    name: "conversationByIdHandler",
    entry: "./functions/conversationByIdHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  chatHandler: defineFunction({
    entry: "./functions/chatHandler/handler.ts",
    name: "chatHandler",
    timeoutSeconds: 28, // Tempo limite para a Lambda de chat
    environment: { // Variáveis específicas para o chatHandler
      ...commonLambdaEnvironment, // Herda as variáveis comuns
      // Variáveis específicas para RDS Data API (usadas no chatHandler)
      DB_CLUSTER_ARN: `arn:aws:rds:SEU_REGION:SEU_ID_DA_CONTA:cluster:SEU_CLUSTER_RDS_ID`, // ARN do seu cluster RDS
      DB_SECRET_ARN: `arn:aws:secretsmanager:SEU_REGION:SEU_ID_DA_CONTA:secret:minha-app/prod/database-url-xxxxxx`, // ARN do seu segredo
      DB_NAME: "odin",
    },
  }),
  // JR Points
  getJrPointsData: defineFunction({
    name: "getJrPointsData",
    entry: "./functions/getJrPointsData/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  updateRankingStatus: defineFunction({
    name: "updateRankingStatus",
    entry: "./functions/updateRankingStatus/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  addEnterpriseTags: defineFunction({
    name: "addEnterpriseTags",
    entry: "./functions/addEnterpriseTags/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  // Tarefas
  tasksHandler: defineFunction({
    name: "tasksHandler",
    entry: "./functions/tasksHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  taskByIdHandler: defineFunction({
    name: "taskByIdHandler",
    entry: "./functions/taskByIdHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  getMyTasks: defineFunction({
    name: "getMyTasks",
    entry: "./functions/getMyTasks/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  // Pontos do Usuário
  getMyPoints: defineFunction({
    name: "getMyPoints",
    entry: "./functions/getMyPoints/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  // Cargos (Roles)
  rolesHandler: defineFunction({
    name: "rolesHandler",
    entry: "./functions/rolesHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  roleByIdHandler: defineFunction({
    name: "roleByIdHandler",
    entry: "./functions/roleByIdHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  // Tags de Pontos
  tagsHandler: defineFunction({
    name: "tagsHandler",
    entry: "./functions/tagsHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  tagByIdHandler: defineFunction({
    name: "tagByIdHandler",
    entry: "./functions/tagByIdHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  addTagToUsers: defineFunction({
    name: "addTagToUsers",
    entry: "./functions/addTagToUsers/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  // Usuários e Cadastros
  usersHandler: defineFunction({
    name: "usersHandler",
    entry: "./functions/usersHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  userByIdHandler: defineFunction({
    name: "userByIdHandler",
    entry: "./functions/userByIdHandler/handler.ts",
    environment: {
      ...commonLambdaEnvironment,
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!, // Já existia
    },
  }),
  registerManyUsers: defineFunction({
    name: "registerManyUsers",
    entry: "./functions/registerManyUsers/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  registrationRequestsHandler: defineFunction({
    name: "registrationRequestsHandler",
    entry: "./functions/registrationRequestsHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  registrationRequestByIdHandler: defineFunction({
    name: "registrationRequestByIdHandler",
    entry: "./functions/registrationRequestByIdHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  userTagsAndLinksHandler: defineFunction({
    name: "userTagsAndLinksHandler",
    entry: "./functions/userTagsAndLinksHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  // Reports
  reportsHandler: defineFunction({
    name: "reportsHandler",
    entry: "./functions/reportsHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  reportByIdHandler: defineFunction({
    name: "reportByIdHandler",
    entry: "./functions/reportByIdHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  // Reservas
  reservationsHandler: defineFunction({
    name: "reservationsHandler",
    entry: "./functions/reservationsHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  reservationByIdHandler: defineFunction({
    name: "reservationByIdHandler",
    entry: "./functions/reservationByIdHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  // Uploads
  getPresignedUrl: defineFunction({
    name: "getPresignedUrl",
    entry: "./functions/getPresignedUrl/handler.ts",
    environment: { ...commonLambdaEnvironment, S3_BUCKET_NAME: process.env.S3_BUCKET_NAME! },
    // Permissões S3 são dadas abaixo via grantReadWrite
  }),
  getChatPresignedUrl: defineFunction({
    name: "getChatPresignedUrl",
    entry: "./functions/getChatPresignedUrl/handler.ts",
    environment: { ...commonLambdaEnvironment, S3_CHAT_BUCKET_NAME: process.env.S3_CHAT_BUCKET_NAME! },
    // Permissões S3 são dadas abaixo via grantReadWrite
  }),
  uploadKnowledge: defineFunction({
    name: "uploadKnowledge",
    entry: "./functions/uploadKnowledge/handler.ts",
    timeoutSeconds: 60,
    environment: {
      ...commonLambdaEnvironment,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY!, // Já existia
    },
    // Permissões S3 são dadas abaixo via grantReadWrite
  }),
  // Dados Externos
  getMondayStats: defineFunction({
    name: "getMondayStats",
    entry: "./functions/getMondayStats/handler.ts",
    environment: {
      ...commonLambdaEnvironment,
      MONDAY_API_KEY: process.env.MONDAY_API_KEY!, // Já existia
      ALFA_BOARD: process.env.ALFA_BOARD!, // Já existia
      BETA_BOARD: process.env.BETA_BOARD!, // Já existia
      DELTA_BOARD: process.env.DELTA_BOARD!, // Já existia
    },
  }),
  // Links Úteis
  usefulLinksHandler: defineFunction({
    name: "usefulLinksHandler",
    entry: "./functions/usefulLinksHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
  usefulLinkByIdHandler: defineFunction({
    name: "usefulLinkByIdHandler",
    entry: "./functions/usefulLinkByIdHandler/handler.ts",
    environment: commonLambdaEnvironment,
  }),
});

// =================================================================
// 2. CRIAÇÃO DOS RECURSOS COM CDK (API, S3)
// =================================================================
const apiStack = backend.createStack("api-stack");
const storageStack = backend.createStack("storage-stack");

const profileImagesBucket = new Bucket(storageStack, "ProfileImagesBucket", {
  accessControl: BucketAccessControl.PRIVATE,
});
const chatFilesBucket = new Bucket(storageStack, "ChatFilesBucket", {
  accessControl: BucketAccessControl.PRIVATE,
});

const odinApi = new RestApi(apiStack, "OdinApi", {
  restApiName: "OdinApi",
  deployOptions: { stageName: "dev" },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
  },
  defaultMethodOptions: {
    authorizationType: AuthorizationType.IAM,
  },
});

// =================================================================
// 3. MAPEAMENTO DE TODAS AS ROTAS
// =================================================================

// -- Cultura --
const cultureRoot = odinApi.root.addResource("culture");
cultureRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.cultureHandler.resources.lambda)
);
cultureRoot.addMethod(
  "PATCH",
  new LambdaIntegration(backend.cultureHandler.resources.lambda)
);
cultureRoot
  .addResource("safe-route")
  .addMethod(
    "GET",
    new LambdaIntegration(backend.cultureHandler.resources.lambda),
    { authorizationType: AuthorizationType.NONE }
  ); // Rota pública
cultureRoot
  .addResource("values")
  .addResource("{id}")
  .addMethod(
    "PATCH",
    new LambdaIntegration(backend.cultureHandler.resources.lambda)
  );

// -- Metas --
const houseGoalsRoot = odinApi.root.addResource("house-goals");
houseGoalsRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.getHouseGoals.resources.lambda)
);
houseGoalsRoot
  .addResource("goals")
  .addResource("{id}")
  .addMethod(
    "PATCH",
    new LambdaIntegration(backend.getHouseGoals.resources.lambda)
  );
houseGoalsRoot
  .addResource("objectives")
  .addResource("{id}")
  .addMethod(
    "PATCH",
    new LambdaIntegration(backend.getHouseGoals.resources.lambda)
  );

// -- Chat e Conversas --
const conversationsRoot = odinApi.root.addResource("conversations");
conversationsRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.conversationsHandler.resources.lambda)
);
conversationsRoot.addMethod(
  "POST",
  new LambdaIntegration(backend.conversationsHandler.resources.lambda)
);
conversationsRoot
  .addResource("latest")
  .addMethod(
    "GET",
    new LambdaIntegration(backend.getLatestConversation.resources.lambda)
  );
const conversationById = conversationsRoot.addResource("{conversationId}");
conversationById.addMethod(
  "GET",
  new LambdaIntegration(backend.conversationByIdHandler.resources.lambda)
);
conversationById.addMethod(
  "DELETE",
  new LambdaIntegration(backend.conversationByIdHandler.resources.lambda)
);
odinApi.root
  .addResource("chat")
  .addResource("{conversationId}")
  .addMethod(
    "POST",
    new LambdaIntegration(backend.chatHandler.resources.lambda)
  );

// -- JR Points --
const jrPointsRoot = odinApi.root.addResource("jr-points");
jrPointsRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.getJrPointsData.resources.lambda)
);
jrPointsRoot
  .addResource("ranking-status")
  .addMethod(
    "PATCH",
    new LambdaIntegration(backend.updateRankingStatus.resources.lambda)
  );
odinApi.root
  .addResource("enterprise-points")
  .addResource("add-tags")
  .addMethod(
    "POST",
    new LambdaIntegration(backend.addEnterpriseTags.resources.lambda)
  );

// -- Tarefas --
const tasksRoot = odinApi.root.addResource("tasks");
tasksRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.tasksHandler.resources.lambda)
);
tasksRoot.addMethod(
  "POST",
  new LambdaIntegration(backend.tasksHandler.resources.lambda)
);
const taskById = tasksRoot.addResource("{id}");
taskById.addMethod(
  "PATCH",
  new LambdaIntegration(backend.taskByIdHandler.resources.lambda)
);
taskById.addMethod(
  "DELETE",
  new LambdaIntegration(backend.taskByIdHandler.resources.lambda)
);
odinApi.root
  .addResource("my-tasks")
  .addMethod("GET", new LambdaIntegration(backend.getMyTasks.resources.lambda));

// -- Pontos do Usuário --
odinApi.root
  .addResource("my-points")
  .addResource("{id}")
  .addMethod(
    "GET",
    new LambdaIntegration(backend.getMyPoints.resources.lambda)
  );

// -- Cargos (Roles) --
const rolesRoot = odinApi.root.addResource("roles");
rolesRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.rolesHandler.resources.lambda)
);
rolesRoot.addMethod(
  "POST",
  new LambdaIntegration(backend.rolesHandler.resources.lambda)
);
const roleById = rolesRoot.addResource("{id}");
roleById.addMethod(
  "GET",
  new LambdaIntegration(backend.roleByIdHandler.resources.lambda)
);
roleById.addMethod(
  "PATCH",
  new LambdaIntegration(backend.roleByIdHandler.resources.lambda)
);
roleById.addMethod(
  "DELETE",
  new LambdaIntegration(backend.roleByIdHandler.resources.lambda)
);

// -- Tags de Pontos --
const tagsRoot = odinApi.root.addResource("tags");
tagsRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.tagsHandler.resources.lambda)
);
tagsRoot.addMethod(
  "POST",
  new LambdaIntegration(backend.tagsHandler.resources.lambda)
);
tagsRoot
  .addResource("add-to-users")
  .addMethod(
    "POST",
    new LambdaIntegration(backend.addTagToUsers.resources.lambda)
  );
const tagById = tagsRoot.addResource("{id}");
tagById.addMethod(
  "PATCH",
  new LambdaIntegration(backend.tagByIdHandler.resources.lambda)
);
tagById.addMethod(
  "DELETE",
  new LambdaIntegration(backend.tagByIdHandler.resources.lambda)
);

// -- Usuários e Cadastros --
const usersRoot = odinApi.root.addResource("users");
usersRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.usersHandler.resources.lambda)
);
usersRoot
  .addResource("register-many")
  .addMethod(
    "POST",
    new LambdaIntegration(backend.registerManyUsers.resources.lambda)
  );
const userById = usersRoot.addResource("{id}");
userById.addMethod(
  "GET",
  new LambdaIntegration(backend.userByIdHandler.resources.lambda)
);
userById.addMethod(
  "PATCH",
  new LambdaIntegration(backend.userByIdHandler.resources.lambda)
);
userById.addMethod(
  "DELETE",
  new LambdaIntegration(backend.userByIdHandler.resources.lambda)
);
userById
  .addResource("tags")
  .addMethod(
    "GET",
    new LambdaIntegration(backend.userTagsAndLinksHandler.resources.lambda)
  );
userById
  .addResource("useful-links")
  .addMethod(
    "GET",
    new LambdaIntegration(backend.userTagsAndLinksHandler.resources.lambda)
  );

// -- Pedidos de Cadastro --
const registrationRoot = odinApi.root.addResource("registration-requests");
registrationRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.registrationRequestsHandler.resources.lambda)
);
registrationRoot.addMethod(
  "POST",
  new LambdaIntegration(backend.registrationRequestsHandler.resources.lambda),
  { authorizationType: AuthorizationType.NONE }
); // Rota pública
const registrationById = registrationRoot.addResource("{id}");
registrationById.addMethod(
  "GET",
  new LambdaIntegration(backend.registrationRequestByIdHandler.resources.lambda)
);
registrationById.addMethod(
  "PATCH",
  new LambdaIntegration(backend.registrationRequestByIdHandler.resources.lambda)
);
registrationById.addMethod(
  "DELETE",
  new LambdaIntegration(backend.registrationRequestByIdHandler.resources.lambda)
);

// -- Reports --
const reportsRoot = odinApi.root.addResource("reports");
reportsRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.reportsHandler.resources.lambda)
);
reportsRoot.addMethod(
  "POST",
  new LambdaIntegration(backend.reportsHandler.resources.lambda)
);
reportsRoot
  .addResource("{id}")
  .addMethod(
    "PATCH",
    new LambdaIntegration(backend.reportByIdHandler.resources.lambda)
  );

// -- Reservas --
const reserveRoot = odinApi.root.addResource("reserve");
reserveRoot.addMethod(
  "GET",
  new LambdaIntegration(backend.reservationsHandler.resources.lambda)
);
reserveRoot.addMethod(
  "POST",
  new LambdaIntegration(backend.reservationsHandler.resources.lambda)
);
const reserveById = reserveRoot.addResource("{id}");
reserveById.addMethod(
  "PATCH",
  new LambdaIntegration(backend.reservationByIdHandler.resources.lambda)
);
reserveById.addMethod(
  "DELETE",
  new LambdaIntegration(backend.reservationByIdHandler.resources.lambda)
);

// -- Uploads --
odinApi.root
  .addResource("s3-upload")
  .addMethod(
    "POST",
    new LambdaIntegration(backend.getPresignedUrl.resources.lambda),
    { authorizationType: AuthorizationType.NONE }
  ); // Rota pública
odinApi.root
  .addResource("s3-chat-upload")
  .addMethod(
    "POST",
    new LambdaIntegration(backend.getChatPresignedUrl.resources.lambda)
  );
odinApi.root
  .addResource("knowledge")
  .addResource("upload")
  .addMethod(
    "POST",
    new LambdaIntegration(backend.uploadKnowledge.resources.lambda)
  );

// -- Dados Externos --
odinApi.root
  .addResource("monday-stats")
  .addMethod(
    "GET",
    new LambdaIntegration(backend.getMondayStats.resources.lambda)
  );

// -- Links Úteis --
const usefulLinksRoot = odinApi.root.addResource("useful-links");
usefulLinksRoot.addMethod(
  "POST",
  new LambdaIntegration(backend.usefulLinksHandler.resources.lambda)
);
const usefulLinkById = usefulLinksRoot.addResource("{id}");
usefulLinkById.addMethod(
  "PATCH",
  new LambdaIntegration(backend.usefulLinkByIdHandler.resources.lambda)
);
usefulLinkById.addMethod(
  "DELETE",
  new LambdaIntegration(backend.usefulLinkByIdHandler.resources.lambda)
);

// =================================================================
// 5. POLÍTICA DE SEGURANÇA (IAM)
// =================================================================
const apiPolicy = new Policy(apiStack, "ApiPolicy", {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["execute-api:Invoke"],
      resources: [`${odinApi.arnForExecuteApi("*")}`],
    }),
  ],
});
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(apiPolicy);
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(apiPolicy); // Permite chamar as rotas públicas

// =================================================================
// 6. PERMISSÕES DAS FUNÇÕES PARA OUTROS SERVIÇOS
// =================================================================
const cognitoActions = [
  "cognito-idp:AdminCreateUser",
  "cognito-idp:AdminSetUserPassword",
  "cognito-idp:AdminUpdateUserAttributes",
  "cognito-idp:AdminDeleteUser",
];
backend.auth.resources.userPool.grant(
  backend.userByIdHandler.resources.lambda,
  ...cognitoActions
);
backend.auth.resources.userPool.grant(
  backend.registerManyUsers.resources.lambda,
  ...cognitoActions
);

const sesActions = ["ses:SendEmail", "ses:SendRawEmail"];
backend.registerManyUsers.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: sesActions,
    resources: ["*"], // O SES geralmente usa "*" como recurso para envio
  })
);

// Damos às funções permissão de escrita nos buckets S3
profileImagesBucket.grantReadWrite(backend.getPresignedUrl.resources.lambda);
profileImagesBucket.grantReadWrite(backend.userByIdHandler.resources.lambda);
chatFilesBucket.grantReadWrite(backend.getChatPresignedUrl.resources.lambda);
chatFilesBucket.grantReadWrite(backend.uploadKnowledge.resources.lambda);

const functionsNeedingSecretsManager = [
  backend.getVision,
  backend.updateValue,
  backend.cultureHandler,
  backend.getHouseGoals,
  backend.updateGoal,
  backend.updateObjective,
  backend.conversationsHandler,
  backend.getLatestConversation,
  backend.conversationByIdHandler,
  backend.getJrPointsData,
  backend.updateRankingStatus,
  backend.addEnterpriseTags,
  backend.tasksHandler,
  backend.taskByIdHandler,
  backend.getMyTasks,
  backend.getMyPoints,
  backend.rolesHandler,
  backend.roleByIdHandler,
  backend.tagsHandler,
  backend.tagByIdHandler,
  backend.addTagToUsers,
  backend.usersHandler,
  backend.userByIdHandler,
  backend.registerManyUsers,
  backend.registrationRequestsHandler,
  backend.registrationRequestByIdHandler,
  backend.userTagsAndLinksHandler,
  backend.reportsHandler,
  backend.reportByIdHandler,
  backend.reservationsHandler,
  backend.reservationByIdHandler,
  backend.usefulLinksHandler,
  backend.usefulLinkByIdHandler,
];

functionsNeedingSecretsManager.forEach(func => {
  func.resources.lambda.addToRolePolicy(dbSecretsManagerAccessPolicyStatement);
});

// =================================================================
// 7. SAÍDAS (OUTPUTS)
// =================================================================
backend.addOutput({
  custom: {
    API: {
      [odinApi.restApiName]: {
        endpoint: odinApi.url,
        region: Stack.of(odinApi).region,
        name: odinApi.restApiName,
      },
    },
    Storage: {
      ProfileImageBucket: profileImagesBucket.bucketName,
      ChatFilesBucket: chatFilesBucket.bucketName,
    },
  },
});
