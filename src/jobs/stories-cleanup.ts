import { Cron } from "croner";
import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../lib/prisma.js";

/**
 * Remove stories expirados (expira_em < NOW).
 *
 * Stories são modelo "ephemeral" (24h por padrão). Hard delete OK aqui porque:
 * - O conteúdo é efêmero por design (não há histórico de stories).
 * - `StoryView` é deletado em cascata via Prisma (onDelete: Cascade).
 *
 * Retorna a quantidade deletada para logging/métricas.
 */
export async function runStoriesCleanup(): Promise<number> {
  const result = await prisma.story.deleteMany({
    where: { expira_em: { lt: new Date() } },
  });
  return result.count;
}

/**
 * Agenda a limpeza para rodar **a cada 1 hora** (no minuto :05 para evitar
 * collision com cron jobs externos que geralmente rodam no :00).
 *
 * `protect: true` evita execuções sobrepostas se o job demorar.
 * `catch: true` captura exceções para não derrubar o processo.
 */
export function startStoriesCleanup(log: FastifyBaseLogger): Cron {
  return new Cron(
    "5 * * * *",
    {
      name: "stories-cleanup",
      protect: true,
      catch: (err) => log.error({ err }, "[stories-cleanup] falha"),
    },
    async () => {
      const deleted = await runStoriesCleanup();
      if (deleted > 0) {
        log.info({ deleted }, `[stories-cleanup] ${deleted} stories expirados removidos`);
      }
    }
  );
}
