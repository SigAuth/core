-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "api" TEXT,
    "secondFactor" TEXT,
    "password" TEXT NOT NULL,
    "accounts" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "subject" INTEGER NOT NULL,
    "expire" INTEGER NOT NULL,
    "created" INTEGER NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizationInstance" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "appId" INTEGER NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "refreshTokenExpire" INTEGER NOT NULL,

    CONSTRAINT "AuthorizationInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizationChallenge" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "appId" INTEGER NOT NULL,
    "authorizationCode" TEXT NOT NULL,
    "challenge" TEXT,
    "redirectUri" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorizationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionInstance" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "containerId" INTEGER,
    "appId" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "assetId" INTEGER,

    CONSTRAINT "PermissionInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,

    CONSTRAINT "AssetType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "fields" JSONB NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Container" (
    "id" SERIAL NOT NULL,
    "customId" TEXT,
    "name" TEXT NOT NULL,
    "assets" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "apps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "Container_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mirror" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "autoRun" BOOLEAN NOT NULL DEFAULT false,
    "autoRunInterval" INTEGER,
    "lastRun" TIMESTAMP(3),
    "lastResult" TEXT,

    CONSTRAINT "Mirror_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "oidcAuthCodeUrl" TEXT,
    "token" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "webFetch" JSONB NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Account_api_key" ON "Account"("api");

-- CreateIndex
CREATE UNIQUE INDEX "Account_secondFactor_key" ON "Account"("secondFactor");

-- CreateIndex
CREATE UNIQUE INDEX "Session_id_key" ON "Session"("id");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorizationInstance_refreshToken_key" ON "AuthorizationInstance"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorizationChallenge_authorizationCode_key" ON "AuthorizationChallenge"("authorizationCode");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorizationChallenge_challenge_key" ON "AuthorizationChallenge"("challenge");

-- CreateIndex
CREATE INDEX "PermissionInstance_accountId_idx" ON "PermissionInstance"("accountId");

-- CreateIndex
CREATE INDEX "PermissionInstance_accountId_appId_idx" ON "PermissionInstance"("accountId", "appId");

-- CreateIndex
CREATE INDEX "PermissionInstance_accountId_assetId_idx" ON "PermissionInstance"("accountId", "assetId");

-- CreateIndex
CREATE INDEX "PermissionInstance_accountId_identifier_idx" ON "PermissionInstance"("accountId", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionInstance_accountId_appId_identifier_containerId_a_key" ON "PermissionInstance"("accountId", "appId", "identifier", "containerId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Container_customId_key" ON "Container"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "App_token_key" ON "App"("token");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_subject_fkey" FOREIGN KEY ("subject") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationInstance" ADD CONSTRAINT "AuthorizationInstance_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationInstance" ADD CONSTRAINT "AuthorizationInstance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationChallenge" ADD CONSTRAINT "AuthorizationChallenge_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationChallenge" ADD CONSTRAINT "AuthorizationChallenge_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionInstance" ADD CONSTRAINT "PermissionInstance_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionInstance" ADD CONSTRAINT "PermissionInstance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionInstance" ADD CONSTRAINT "PermissionInstance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionInstance" ADD CONSTRAINT "PermissionInstance_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "AssetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
