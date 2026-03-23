-- CreateTable
CREATE TABLE "PermissionPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allowExMembers" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRule" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "allowedAreas" "AreaRoles"[],
    "allowedRoleIds" TEXT[],

    CONSTRAINT "PolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutePermission" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPermission" (
    "id" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "policyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermissionPolicy_name_key" ON "PermissionPolicy"("name");

-- CreateIndex
CREATE INDEX "PolicyRule_policyId_idx" ON "PolicyRule"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutePermission_path_key" ON "RoutePermission"("path");

-- CreateIndex
CREATE UNIQUE INDEX "ActionPermission_actionKey_key" ON "ActionPermission"("actionKey");

-- AddForeignKey
ALTER TABLE "PolicyRule" ADD CONSTRAINT "PolicyRule_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PermissionPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePermission" ADD CONSTRAINT "RoutePermission_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PermissionPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPermission" ADD CONSTRAINT "ActionPermission_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PermissionPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
