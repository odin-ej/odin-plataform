-- CreateTable
CREATE TABLE "KrakenAgent" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "mythology" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "maxTokens" INTEGER NOT NULL DEFAULT 1024,
    "systemPrompt" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "iconUrl" TEXT,
    "color" TEXT,
    "requiresRag" BOOLEAN NOT NULL DEFAULT false,
    "ragScope" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KrakenAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KrakenConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "title" TEXT,
    "summary" TEXT,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "modelUsed" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KrakenConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KrakenMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "agentId" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "templateUsed" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KrakenMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KrakenCache" (
    "id" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "queryEmbedding" vector(1536),
    "response" TEXT NOT NULL,
    "agentId" TEXT,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KrakenCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KrakenTemplate" (
    "id" TEXT NOT NULL,
    "triggerKeywords" TEXT[],
    "triggerEmbedding" vector(1536),
    "category" TEXT NOT NULL,
    "agentId" TEXT,
    "questionExample" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KrakenTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KrakenKnowledgeChunk" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentEmbedding" vector(1536),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "agentScope" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KrakenKnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KrakenUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "estimatedCostUsd" DECIMAL(10,6) NOT NULL,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "templateUsed" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KrakenUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KrakenRateLimit" (
    "id" TEXT NOT NULL,
    "roleIdentifier" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "maxDailyRequests" INTEGER NOT NULL DEFAULT 30,
    "maxDailyTokens" INTEGER NOT NULL DEFAULT 50000,
    "canUseAgents" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KrakenRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KrakenDailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "requestsCount" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KrakenDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KrakenActivityStream" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "agentId" TEXT,
    "userId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KrakenActivityStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KrakenOdinDoc" (
    "id" TEXT NOT NULL,
    "featurePath" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "generatedFrom" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KrakenOdinDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KrakenConversation_userId_idx" ON "KrakenConversation"("userId");

-- CreateIndex
CREATE INDEX "KrakenConversation_createdAt_idx" ON "KrakenConversation"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "KrakenMessage_conversationId_idx" ON "KrakenMessage"("conversationId");

-- CreateIndex
CREATE INDEX "KrakenMessage_createdAt_idx" ON "KrakenMessage"("createdAt");

-- CreateIndex
CREATE INDEX "KrakenCache_expiresAt_idx" ON "KrakenCache"("expiresAt");

-- CreateIndex
CREATE INDEX "KrakenKnowledgeChunk_sourceType_idx" ON "KrakenKnowledgeChunk"("sourceType");

-- CreateIndex
CREATE INDEX "KrakenKnowledgeChunk_isActive_idx" ON "KrakenKnowledgeChunk"("isActive");

-- CreateIndex
CREATE INDEX "KrakenUsageLog_userId_idx" ON "KrakenUsageLog"("userId");

-- CreateIndex
CREATE INDEX "KrakenUsageLog_agentId_idx" ON "KrakenUsageLog"("agentId");

-- CreateIndex
CREATE INDEX "KrakenUsageLog_createdAt_idx" ON "KrakenUsageLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KrakenRateLimit_roleIdentifier_key" ON "KrakenRateLimit"("roleIdentifier");

-- CreateIndex
CREATE INDEX "KrakenDailyUsage_userId_idx" ON "KrakenDailyUsage"("userId");

-- CreateIndex
CREATE INDEX "KrakenDailyUsage_date_idx" ON "KrakenDailyUsage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "KrakenDailyUsage_userId_date_key" ON "KrakenDailyUsage"("userId", "date");

-- CreateIndex
CREATE INDEX "KrakenActivityStream_createdAt_idx" ON "KrakenActivityStream"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "KrakenActivityStream_eventType_idx" ON "KrakenActivityStream"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "KrakenOdinDoc_featurePath_key" ON "KrakenOdinDoc"("featurePath");

-- AddForeignKey
ALTER TABLE "KrakenConversation" ADD CONSTRAINT "KrakenConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KrakenConversation" ADD CONSTRAINT "KrakenConversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "KrakenAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KrakenMessage" ADD CONSTRAINT "KrakenMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "KrakenConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KrakenMessage" ADD CONSTRAINT "KrakenMessage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "KrakenAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KrakenCache" ADD CONSTRAINT "KrakenCache_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "KrakenAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KrakenTemplate" ADD CONSTRAINT "KrakenTemplate_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "KrakenAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KrakenUsageLog" ADD CONSTRAINT "KrakenUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KrakenUsageLog" ADD CONSTRAINT "KrakenUsageLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "KrakenAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KrakenUsageLog" ADD CONSTRAINT "KrakenUsageLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "KrakenConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KrakenActivityStream" ADD CONSTRAINT "KrakenActivityStream_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "KrakenAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
