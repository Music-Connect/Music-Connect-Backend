-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('artista', 'contratante');

-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM ('pendente', 'aceita', 'recusada', 'cancelada');

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" SERIAL NOT NULL,
    "usuario" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "email_verificado_em" TIMESTAMP(3),
    "tipo_usuario" "TipoUsuario" NOT NULL,
    "telefone" TEXT,
    "imagem_perfil_url" TEXT,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "propostas" (
    "id_proposta" SERIAL NOT NULL,
    "id_contratante" INTEGER NOT NULL,
    "id_artista" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data_evento" DATE NOT NULL,
    "hora_evento" TIME,
    "local_evento" TEXT NOT NULL,
    "endereco_completo" TEXT,
    "tipo_evento" TEXT,
    "duracao_horas" DECIMAL(3,1),
    "publico_esperado" INTEGER,
    "equipamento_incluso" BOOLEAN NOT NULL DEFAULT false,
    "nome_responsavel" TEXT,
    "telefone_contato" TEXT,
    "observacoes" TEXT,
    "valor_oferecido" DECIMAL(10,2) NOT NULL,
    "status" "StatusProposta" NOT NULL DEFAULT 'pendente',
    "mensagem_resposta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propostas_pkey" PRIMARY KEY ("id_proposta")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes" (
    "id_avaliacao" SERIAL NOT NULL,
    "id_avaliador" INTEGER NOT NULL,
    "id_avaliado" INTEGER NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id_avaliacao")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_tipo_usuario_idx" ON "usuarios"("tipo_usuario");

-- CreateIndex
CREATE INDEX "usuarios_genero_musical_idx" ON "usuarios"("genero_musical");

-- CreateIndex
CREATE INDEX "usuarios_cidade_idx" ON "usuarios"("cidade");

-- CreateIndex
CREATE INDEX "usuarios_estado_idx" ON "usuarios"("estado");

-- CreateIndex
CREATE INDEX "propostas_id_contratante_idx" ON "propostas"("id_contratante");

-- CreateIndex
CREATE INDEX "propostas_id_artista_idx" ON "propostas"("id_artista");

-- CreateIndex
CREATE INDEX "propostas_status_idx" ON "propostas"("status");

-- CreateIndex
CREATE INDEX "propostas_data_evento_idx" ON "propostas"("data_evento");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_id_usuario_idx" ON "password_reset_tokens"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_id_usuario_idx" ON "email_verification_tokens"("id_usuario");

-- CreateIndex
CREATE INDEX "avaliacoes_id_avaliado_idx" ON "avaliacoes"("id_avaliado");

-- CreateIndex
CREATE INDEX "avaliacoes_id_avaliador_idx" ON "avaliacoes"("id_avaliador");

-- CreateIndex
CREATE UNIQUE INDEX "avaliacoes_id_avaliador_id_avaliado_key" ON "avaliacoes"("id_avaliador", "id_avaliado");

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_id_contratante_fkey" FOREIGN KEY ("id_contratante") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_id_artista_fkey" FOREIGN KEY ("id_artista") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_id_avaliador_fkey" FOREIGN KEY ("id_avaliador") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_id_avaliado_fkey" FOREIGN KEY ("id_avaliado") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
