import * as dotenv from 'dotenv';
dotenv.config();
import { defineBackend } from '@aws-amplify/backend';
import { defineFunction } from '@aws-amplify/backend-function';
import { auth } from './auth/resource';
import { Stack } from "aws-cdk-lib";
import { AuthorizationType, Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket, BucketAccessControl } from 'aws-cdk-lib/aws-s3';

// =================================================================
// 1. DEFINIÇÃO DO BACKEND E DE TODAS AS FUNÇÕES LAMBDA
// =================================================================

// Primeiro, definimos todas as nossas funções
const backend = defineBackend({
  auth,
  // Cultura & Estratégia
  getVision: defineFunction({ name: 'getVision', entry: './functions/getVision/handler.ts' }),
  updateValue: defineFunction({ name: 'updateValue', entry: './functions/updateValue/handler.ts' }),
  cultureHandler: defineFunction({ name: 'cultureHandler', entry: './functions/cultureHandler/handler.ts' }),
  // Metas e Objetivos
  getHouseGoals: defineFunction({ name: 'getHouseGoals', entry: './functions/getHouseGoals/handler.ts' }),
  updateGoal: defineFunction({ name: 'updateGoal', entry: './functions/updateGoal/handler.ts' }),
  updateObjective: defineFunction({ name: 'updateObjective', entry: './functions/updateObjective/handler.ts' }),
  // Chat e Conversas
  conversationsHandler: defineFunction({ name: 'conversationsHandler', entry: './functions/conversationsHandler/handler.ts' }),
  getLatestConversation: defineFunction({ name: 'getLatestConversation', entry: './functions/getLatestConversation/handler.ts' }),
  conversationByIdHandler: defineFunction({ name: 'conversationByIdHandler', entry: './functions/conversationByIdHandler/handler.ts' }),
  chatHandler: defineFunction({ 
    entry: './functions/chatHandler/handler.ts', 
    name: 'chatHandler',
    timeoutSeconds: 28,
    environment: {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
        GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY!,
        GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID!,
    }
  }),
  // JR Points
  getJrPointsData: defineFunction({ name: 'getJrPointsData', entry: './functions/getJrPointsData/handler.ts' }),
  updateRankingStatus: defineFunction({ name: 'updateRankingStatus', entry: './functions/updateRankingStatus/handler.ts' }),
  addEnterpriseTags: defineFunction({ name: 'addEnterpriseTags', entry: './functions/addEnterpriseTags/handler.ts' }),
  // Tarefas
  tasksHandler: defineFunction({ name: 'tasksHandler', entry: './functions/tasksHandler/handler.ts' }),
  taskByIdHandler: defineFunction({ name: 'taskByIdHandler', entry: './functions/taskByIdHandler/handler.ts' }),
  getMyTasks: defineFunction({ name: 'getMyTasks', entry: './functions/getMyTasks/handler.ts' }),
  // Pontos do Usuário
  getMyPoints: defineFunction({ name: 'getMyPoints', entry: './functions/getMyPoints/handler.ts' }),
  // Cargos (Roles)
  rolesHandler: defineFunction({ name: 'rolesHandler', entry: './functions/rolesHandler/handler.ts' }),
  roleByIdHandler: defineFunction({ name: 'roleByIdHandler', entry: './functions/roleByIdHandler/handler.ts' }),
  // Tags de Pontos
  tagsHandler: defineFunction({ name: 'tagsHandler', entry: './functions/tagsHandler/handler.ts' }),
  tagByIdHandler: defineFunction({ name: 'tagByIdHandler', entry: './functions/tagByIdHandler/handler.ts' }),
  addTagToUsers: defineFunction({ name: 'addTagToUsers', entry: './functions/addTagToUsers/handler.ts' }),
  // Usuários e Cadastros
  usersHandler: defineFunction({ name: 'usersHandler', entry: './functions/usersHandler/handler.ts' }),
  userByIdHandler: defineFunction({ 
    name: 'userByIdHandler',
    entry: './functions/userByIdHandler/handler.ts',
    environment: {
        AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME!,
    }
  }),
  registerManyUsers: defineFunction({ 
    name: 'registerManyUsers',
    entry: './functions/registerManyUsers/handler.ts',
  }),
  registrationRequestsHandler: defineFunction({ name: 'registrationRequestsHandler', entry: './functions/registrationRequestsHandler/handler.ts' }),
  registrationRequestByIdHandler: defineFunction({ name: 'registrationRequestByIdHandler', entry: './functions/registrationRequestByIdHandler/handler.ts' }),
  userTagsAndLinksHandler: defineFunction({ name: 'userTagsAndLinksHandler', entry: './functions/userTagsAndLinksHandler/handler.ts' }),
  // Reports
  reportsHandler: defineFunction({ name: 'reportsHandler',   entry: './functions/reportsHandler/handler.ts' }),
  reportByIdHandler: defineFunction({ name: 'reportByIdHandler', entry: './functions/reportByIdHandler/handler.ts' }),
  // Reservas
  reservationsHandler: defineFunction({ name: 'reservationsHandler', entry: './functions/reservationsHandler/handler.ts' }),
  reservationByIdHandler: defineFunction({ name: 'reservationByIdHandler', entry: './functions/reservationByIdHandler/handler.ts' }),
  // Uploads
  getPresignedUrl: defineFunction({ 
    name: 'getPresignedUrl',
    entry: './functions/getPresignedUrl/handler.ts',
    environment: { AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME! }
  }),
  getChatPresignedUrl: defineFunction({ 
    name: 'getChatPresignedUrl',
    entry: './functions/getChatPresignedUrl/handler.ts',
    environment: { AWS_S3_CHAT_BUCKET_NAME: process.env.AWS_S3_CHAT_BUCKET_NAME! }
  }),
  uploadKnowledge: defineFunction({ 
    name: 'uploadKnowledge',
    entry: './functions/uploadKnowledge/handler.ts', 
    timeoutSeconds: 60,
    environment: {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
    },
    
  }),
  // Dados Externos
  getMondayStats: defineFunction({
    name: 'getMondayStats',
    entry: './functions/getMondayStats/handler.ts',
    environment: {
        MONDAY_API_KEY: process.env.MONDAY_API_KEY!,
        ALFA_BOARD: process.env.ALFA_BOARD!,
        BETA_BOARD: process.env.BETA_BOARD!,
        DELTA_BOARD: process.env.DELTA_BOARD!,
    }
  }),
  // Links Úteis
  usefulLinksHandler: defineFunction({ name: 'usefulLinksHandler', entry: './functions/usefulLinksHandler/handler.ts' }),
  usefulLinkByIdHandler: defineFunction({ name: 'usefulLinkByIdHandler', entry: './functions/usefulLinkByIdHandler/handler.ts' }),
});

// =================================================================
// 2. CRIAÇÃO DOS RECURSOS COM CDK (API, S3)
// =================================================================
const apiStack = backend.createStack("api-stack");
const storageStack = backend.createStack("storage-stack");

const profileImagesBucket = new Bucket(storageStack, "ProfileImagesBucket", { accessControl: BucketAccessControl.PRIVATE });
const chatFilesBucket = new Bucket(storageStack, "ChatFilesBucket", { accessControl: BucketAccessControl.PRIVATE });

const odinApi = new RestApi(apiStack, "OdinApi", {
  restApiName: "OdinApi",
  deployOptions: { stageName: "dev" },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
  },
  defaultMethodOptions: {
    authorizationType: AuthorizationType.IAM,
  }
});

// =================================================================
// 3. MAPEAMENTO DE TODAS AS ROTAS
// =================================================================

// -- Cultura --
const cultureRoot = odinApi.root.addResource("culture");
cultureRoot.addMethod("GET", new LambdaIntegration(backend.cultureHandler.resources.lambda));
cultureRoot.addMethod("PATCH", new LambdaIntegration(backend.cultureHandler.resources.lambda));
cultureRoot.addResource("safe-route").addMethod("GET", new LambdaIntegration(backend.cultureHandler.resources.lambda), { authorizationType: AuthorizationType.NONE }); // Rota pública
cultureRoot.addResource("values").addResource("{id}").addMethod("PATCH", new LambdaIntegration(backend.cultureHandler.resources.lambda));

// -- Metas --
const houseGoalsRoot = odinApi.root.addResource("house-goals");
houseGoalsRoot.addMethod("GET", new LambdaIntegration(backend.getHouseGoals.resources.lambda));
houseGoalsRoot.addResource("goals").addResource("{id}").addMethod("PATCH", new LambdaIntegration(backend.getHouseGoals.resources.lambda));
houseGoalsRoot.addResource("objectives").addResource("{id}").addMethod("PATCH", new LambdaIntegration(backend.getHouseGoals.resources.lambda));

// -- Chat e Conversas --
const conversationsRoot = odinApi.root.addResource("conversations");
conversationsRoot.addMethod("GET", new LambdaIntegration(backend.conversationsHandler.resources.lambda));
conversationsRoot.addMethod("POST", new LambdaIntegration(backend.conversationsHandler.resources.lambda));
conversationsRoot.addResource("latest").addMethod("GET", new LambdaIntegration(backend.getLatestConversation.resources.lambda));
const conversationById = conversationsRoot.addResource("{conversationId}");
conversationById.addMethod("GET", new LambdaIntegration(backend.conversationByIdHandler.resources.lambda));
conversationById.addMethod("DELETE", new LambdaIntegration(backend.conversationByIdHandler.resources.lambda));
odinApi.root.addResource("chat").addResource("{conversationId}").addMethod("POST", new LambdaIntegration(backend.chatHandler.resources.lambda));

// -- JR Points --
const jrPointsRoot = odinApi.root.addResource("jr-points");
jrPointsRoot.addMethod("GET", new LambdaIntegration(backend.getJrPointsData.resources.lambda));
jrPointsRoot.addResource("ranking-status").addMethod("PATCH", new LambdaIntegration(backend.updateRankingStatus.resources.lambda));
odinApi.root.addResource("enterprise-points").addResource("add-tags").addMethod("POST", new LambdaIntegration(backend.addEnterpriseTags.resources.lambda));

// -- Tarefas --
const tasksRoot = odinApi.root.addResource("tasks");
tasksRoot.addMethod("GET", new LambdaIntegration(backend.tasksHandler.resources.lambda));
tasksRoot.addMethod("POST", new LambdaIntegration(backend.tasksHandler.resources.lambda));
const taskById = tasksRoot.addResource("{id}");
taskById.addMethod("PATCH", new LambdaIntegration(backend.taskByIdHandler.resources.lambda));
taskById.addMethod("DELETE", new LambdaIntegration(backend.taskByIdHandler.resources.lambda));
odinApi.root.addResource("my-tasks").addMethod("GET", new LambdaIntegration(backend.getMyTasks.resources.lambda));

// -- Pontos do Usuário --
odinApi.root.addResource("my-points").addResource("{id}").addMethod("GET", new LambdaIntegration(backend.getMyPoints.resources.lambda));

// -- Cargos (Roles) --
const rolesRoot = odinApi.root.addResource("roles");
rolesRoot.addMethod("GET", new LambdaIntegration(backend.rolesHandler.resources.lambda));
rolesRoot.addMethod("POST", new LambdaIntegration(backend.rolesHandler.resources.lambda));
const roleById = rolesRoot.addResource("{id}");
roleById.addMethod("GET", new LambdaIntegration(backend.roleByIdHandler.resources.lambda));
roleById.addMethod("PATCH", new LambdaIntegration(backend.roleByIdHandler.resources.lambda));
roleById.addMethod("DELETE", new LambdaIntegration(backend.roleByIdHandler.resources.lambda));

// -- Tags de Pontos --
const tagsRoot = odinApi.root.addResource("tags");
tagsRoot.addMethod("GET", new LambdaIntegration(backend.tagsHandler.resources.lambda));
tagsRoot.addMethod("POST", new LambdaIntegration(backend.tagsHandler.resources.lambda));
tagsRoot.addResource("add-to-users").addMethod("POST", new LambdaIntegration(backend.addTagToUsers.resources.lambda));
const tagById = tagsRoot.addResource("{id}");
tagById.addMethod("PATCH", new LambdaIntegration(backend.tagByIdHandler.resources.lambda));
tagById.addMethod("DELETE", new LambdaIntegration(backend.tagByIdHandler.resources.lambda));

// -- Usuários e Cadastros --
const usersRoot = odinApi.root.addResource("users");
usersRoot.addMethod("GET", new LambdaIntegration(backend.usersHandler.resources.lambda));
usersRoot.addResource("register-many").addMethod("POST", new LambdaIntegration(backend.registerManyUsers.resources.lambda));
const userById = usersRoot.addResource("{id}");
userById.addMethod("GET", new LambdaIntegration(backend.userByIdHandler.resources.lambda));
userById.addMethod("PATCH", new LambdaIntegration(backend.userByIdHandler.resources.lambda));
userById.addMethod("DELETE", new LambdaIntegration(backend.userByIdHandler.resources.lambda));
userById.addResource("tags").addMethod("GET", new LambdaIntegration(backend.userTagsAndLinksHandler.resources.lambda));
userById.addResource("useful-links").addMethod("GET", new LambdaIntegration(backend.userTagsAndLinksHandler.resources.lambda));

// -- Pedidos de Cadastro --
const registrationRoot = odinApi.root.addResource("registration-requests");
registrationRoot.addMethod("GET", new LambdaIntegration(backend.registrationRequestsHandler.resources.lambda));
registrationRoot.addMethod("POST", new LambdaIntegration(backend.registrationRequestsHandler.resources.lambda), { authorizationType: AuthorizationType.NONE }); // Rota pública
const registrationById = registrationRoot.addResource("{id}");
registrationById.addMethod("GET", new LambdaIntegration(backend.registrationRequestByIdHandler.resources.lambda));
registrationById.addMethod("PATCH", new LambdaIntegration(backend.registrationRequestByIdHandler.resources.lambda));
registrationById.addMethod("DELETE", new LambdaIntegration(backend.registrationRequestByIdHandler.resources.lambda));

// -- Reports --
const reportsRoot = odinApi.root.addResource("reports");
reportsRoot.addMethod("GET", new LambdaIntegration(backend.reportsHandler.resources.lambda));
reportsRoot.addMethod("POST", new LambdaIntegration(backend.reportsHandler.resources.lambda));
reportsRoot.addResource("{id}").addMethod("PATCH", new LambdaIntegration(backend.reportByIdHandler.resources.lambda));

// -- Reservas --
const reserveRoot = odinApi.root.addResource("reserve");
reserveRoot.addMethod("GET", new LambdaIntegration(backend.reservationsHandler.resources.lambda));
reserveRoot.addMethod("POST", new LambdaIntegration(backend.reservationsHandler.resources.lambda));
const reserveById = reserveRoot.addResource("{id}");
reserveById.addMethod("PATCH", new LambdaIntegration(backend.reservationByIdHandler.resources.lambda));
reserveById.addMethod("DELETE", new LambdaIntegration(backend.reservationByIdHandler.resources.lambda));

// -- Uploads --
odinApi.root.addResource("s3-upload").addMethod("POST", new LambdaIntegration(backend.getPresignedUrl.resources.lambda), { authorizationType: AuthorizationType.NONE }); // Rota pública
odinApi.root.addResource("s3-chat-upload").addMethod("POST", new LambdaIntegration(backend.getChatPresignedUrl.resources.lambda));
odinApi.root.addResource("knowledge").addResource("upload").addMethod("POST", new LambdaIntegration(backend.uploadKnowledge.resources.lambda));

// -- Dados Externos --
odinApi.root.addResource("monday-stats").addMethod("GET", new LambdaIntegration(backend.getMondayStats.resources.lambda));

// -- Links Úteis --
const usefulLinksRoot = odinApi.root.addResource("useful-links");
usefulLinksRoot.addMethod("POST", new LambdaIntegration(backend.usefulLinksHandler.resources.lambda));
const usefulLinkById = usefulLinksRoot.addResource("{id}");
usefulLinkById.addMethod("PATCH", new LambdaIntegration(backend.usefulLinkByIdHandler.resources.lambda));
usefulLinkById.addMethod("DELETE", new LambdaIntegration(backend.usefulLinkByIdHandler.resources.lambda));


// =================================================================
// 5. POLÍTICA DE SEGURANÇA (IAM)
// =================================================================
const apiPolicy = new Policy(apiStack, "ApiPolicy", {
  statements: [ new PolicyStatement({ effect: Effect.ALLOW, actions: ["execute-api:Invoke"], resources: [`${odinApi.arnForExecuteApi("*")}`] }) ],
});
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(apiPolicy);
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(apiPolicy); // Permite chamar as rotas públicas

// =================================================================
// 6. PERMISSÕES DAS FUNÇÕES PARA OUTROS SERVIÇOS
// =================================================================
const cognitoActions = ["cognito-idp:AdminCreateUser", "cognito-idp:AdminSetUserPassword", "cognito-idp:AdminUpdateUserAttributes", "cognito-idp:AdminDeleteUser"];
backend.auth.resources.userPool.grant(backend.userByIdHandler.resources.lambda, ...cognitoActions);
backend.auth.resources.userPool.grant(backend.registerManyUsers.resources.lambda, ...cognitoActions);

const sesActions = ["ses:SendEmail", "ses:SendRawEmail"];
backend.registerManyUsers.resources.lambda.addToRolePolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: sesActions,
    resources: ["*"], // O SES geralmente usa "*" como recurso para envio
}));

// Damos às funções permissão de escrita nos buckets S3
profileImagesBucket.grantReadWrite(backend.getPresignedUrl.resources.lambda);
profileImagesBucket.grantReadWrite(backend.userByIdHandler.resources.lambda);
chatFilesBucket.grantReadWrite(backend.getChatPresignedUrl.resources.lambda);
chatFilesBucket.grantReadWrite(backend.uploadKnowledge.resources.lambda);


// =================================================================
// 7. SAÍDAS (OUTPUTS)
// =================================================================
backend.addOutput({
  custom: {
    API: { [odinApi.restApiName]: { endpoint: odinApi.url, region: Stack.of(odinApi).region, name: odinApi.restApiName } },
    Storage: { ProfileImageBucket: profileImagesBucket.bucketName, ChatFilesBucket: chatFilesBucket.bucketName }
  },
});