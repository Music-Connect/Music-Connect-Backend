-- AlterTable
ALTER TABLE "comentarios" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "propostas" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "comentarios_deleted_at_idx" ON "comentarios"("deleted_at");

-- CreateIndex
CREATE INDEX "propostas_deleted_at_idx" ON "propostas"("deleted_at");
