import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);

  app.get("/", async (request, reply) => {
    if (request.user!.tipo_usuario !== "artista") {
      return reply.status(401).send({ error: "Somente artistas podem ver analytics." });
    }
    const userId = request.user!.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [visitas, novosSeguidores, propostas] = await Promise.all([
      // Contagem de visitas ao perfil nos ultimos 30 dias
      prisma.visitaPerfil.count({
        where: { id_artista: userId, created_at: { gte: thirtyDaysAgo } }
      }),
      // Novos seguidores nos ultimos 30 dias
      prisma.follow.count({
        where: { followingId: userId, created_at: { gte: thirtyDaysAgo } }
      }),
      // Propostas recebidas
      prisma.proposta.count({
        where: { id_artista: userId, created_at: { gte: thirtyDaysAgo } }
      })
    ]);

    // Engajamento em posts
    const result = await prisma.$queryRaw<{ likes: bigint, comentarios: bigint }[]>`
      SELECT 
        COALESCE(SUM(curtidas_count), 0) as likes,
        COALESCE(SUM(comentarios_count), 0) as comentarios
      FROM posts
      WHERE id_autor = ${userId} AND created_at >= ${thirtyDaysAgo}
    `;
    const likes = Number(result[0]?.likes || 0);
    const comentarios = Number(result[0]?.comentarios || 0);

    return reply.send({
      visitas30dias: visitas,
      seguidores30dias: novosSeguidores,
      propostas30dias: propostas,
      engajamento30dias: likes + comentarios,
    });
  });
};
