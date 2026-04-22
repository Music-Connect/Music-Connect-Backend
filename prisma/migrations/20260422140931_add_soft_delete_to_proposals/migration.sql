-- AlterTable
ALTER TABLE "propostas" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "propostas_deleted_at_idx" ON "propostas"("deleted_at");
