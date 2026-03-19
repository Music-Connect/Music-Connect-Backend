/*
  Warnings:

  - You are about to drop the `email_verification_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `password_reset_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuarios` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "avaliacoes" DROP CONSTRAINT "avaliacoes_id_avaliado_fkey";

-- DropForeignKey
ALTER TABLE "avaliacoes" DROP CONSTRAINT "avaliacoes_id_avaliador_fkey";

-- DropForeignKey
ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "email_verification_tokens_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "propostas" DROP CONSTRAINT "propostas_id_artista_fkey";

-- DropForeignKey
ALTER TABLE "propostas" DROP CONSTRAINT "propostas_id_contratante_fkey";

-- AlterTable
ALTER TABLE "avaliacoes" ALTER COLUMN "id_avaliador" SET DATA TYPE TEXT,
ALTER COLUMN "id_avaliado" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "propostas" ALTER COLUMN "id_contratante" SET DATA TYPE TEXT,
ALTER COLUMN "id_artista" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "email_verification_tokens";

-- DropTable
DROP TABLE "password_reset_tokens";

-- DropTable
DROP TABLE "usuarios";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tipo_usuario" "TipoUsuario",
    "telefone" TEXT,
    "descricao" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "genero_musical" TEXT,
    "preco_minimo" DECIMAL(10,2),
    "preco_maximo" DECIMAL(10,2),
    "portfolio" TEXT[],
    "spotify_url" TEXT,
    "instagram_url" TEXT,
    "youtube_url" TEXT,
    "cor_tema" TEXT,
    "cor_banner" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tipo_usuario_idx" ON "users"("tipo_usuario");

-- CreateIndex
CREATE INDEX "users_genero_musical_idx" ON "users"("genero_musical");

-- CreateIndex
CREATE INDEX "users_cidade_idx" ON "users"("cidade");

-- CreateIndex
CREATE INDEX "users_estado_idx" ON "users"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_id_contratante_fkey" FOREIGN KEY ("id_contratante") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_id_artista_fkey" FOREIGN KEY ("id_artista") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_id_avaliador_fkey" FOREIGN KEY ("id_avaliador") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_id_avaliado_fkey" FOREIGN KEY ("id_avaliado") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
