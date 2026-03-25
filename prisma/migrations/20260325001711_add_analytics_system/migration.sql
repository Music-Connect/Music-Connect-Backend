-- CreateTable
CREATE TABLE "visitas_perfil" (
    "id_visita" SERIAL NOT NULL,
    "id_visitante" TEXT,
    "id_artista" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitas_perfil_pkey" PRIMARY KEY ("id_visita")
);

-- CreateIndex
CREATE INDEX "visitas_perfil_id_artista_idx" ON "visitas_perfil"("id_artista");

-- CreateIndex
CREATE INDEX "visitas_perfil_created_at_idx" ON "visitas_perfil"("created_at");

-- AddForeignKey
ALTER TABLE "visitas_perfil" ADD CONSTRAINT "visitas_perfil_id_visitante_fkey" FOREIGN KEY ("id_visitante") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_perfil" ADD CONSTRAINT "visitas_perfil_id_artista_fkey" FOREIGN KEY ("id_artista") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
