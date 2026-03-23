-- CreateEnum
CREATE TYPE "TipoPost" AS ENUM ('post', 'disponibilidade', 'buscando');

-- CreateEnum
CREATE TYPE "VisibilidadePost" AS ENUM ('publico', 'seguidores', 'privado');

-- CreateEnum
CREATE TYPE "TipoMidia" AS ENUM ('imagem', 'video');

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "id_autor" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "tipo" "TipoPost" NOT NULL DEFAULT 'post',
    "visibilidade" "VisibilidadePost" NOT NULL DEFAULT 'publico',
    "imagens" TEXT[],
    "video_url" TEXT,
    "tags" TEXT[],
    "cidade" TEXT,
    "estado" TEXT,
    "curtidas_count" INTEGER NOT NULL DEFAULT 0,
    "comentarios_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curtidas" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_post" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curtidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" TEXT NOT NULL,
    "id_autor" TEXT NOT NULL,
    "id_post" TEXT NOT NULL,
    "id_comentario_pai" TEXT,
    "conteudo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "id_autor" TEXT NOT NULL,
    "midia_url" TEXT NOT NULL,
    "tipo_midia" "TipoMidia" NOT NULL DEFAULT 'imagem',
    "duracao" INTEGER NOT NULL DEFAULT 5,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_views" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_story" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posts_id_autor_idx" ON "posts"("id_autor");

-- CreateIndex
CREATE INDEX "posts_tipo_idx" ON "posts"("tipo");

-- CreateIndex
CREATE INDEX "posts_visibilidade_idx" ON "posts"("visibilidade");

-- CreateIndex
CREATE INDEX "posts_cidade_idx" ON "posts"("cidade");

-- CreateIndex
CREATE INDEX "posts_estado_idx" ON "posts"("estado");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_id_autor_created_at_idx" ON "posts"("id_autor", "created_at" DESC);

-- CreateIndex
CREATE INDEX "curtidas_id_post_idx" ON "curtidas"("id_post");

-- CreateIndex
CREATE INDEX "curtidas_id_usuario_idx" ON "curtidas"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "curtidas_id_usuario_id_post_key" ON "curtidas"("id_usuario", "id_post");

-- CreateIndex
CREATE INDEX "comentarios_id_post_created_at_idx" ON "comentarios"("id_post", "created_at" DESC);

-- CreateIndex
CREATE INDEX "comentarios_id_autor_idx" ON "comentarios"("id_autor");

-- CreateIndex
CREATE INDEX "comentarios_id_comentario_pai_idx" ON "comentarios"("id_comentario_pai");

-- CreateIndex
CREATE INDEX "stories_id_autor_idx" ON "stories"("id_autor");

-- CreateIndex
CREATE INDEX "stories_expira_em_idx" ON "stories"("expira_em");

-- CreateIndex
CREATE INDEX "stories_id_autor_expira_em_idx" ON "stories"("id_autor", "expira_em");

-- CreateIndex
CREATE INDEX "story_views_id_story_idx" ON "story_views"("id_story");

-- CreateIndex
CREATE UNIQUE INDEX "story_views_id_usuario_id_story_key" ON "story_views"("id_usuario", "id_story");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_id_autor_fkey" FOREIGN KEY ("id_autor") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curtidas" ADD CONSTRAINT "curtidas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curtidas" ADD CONSTRAINT "curtidas_id_post_fkey" FOREIGN KEY ("id_post") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_id_autor_fkey" FOREIGN KEY ("id_autor") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_id_post_fkey" FOREIGN KEY ("id_post") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_id_comentario_pai_fkey" FOREIGN KEY ("id_comentario_pai") REFERENCES "comentarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_id_autor_fkey" FOREIGN KEY ("id_autor") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_id_story_fkey" FOREIGN KEY ("id_story") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
