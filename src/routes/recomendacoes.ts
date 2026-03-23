import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { paginationSchema } from "../lib/schemas.js";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

export async function recomendacoesRoutes(app: FastifyInstance) {
  // ── Artistas recomendados ──
  app.get("/artistas", async (req, reply) => {
    const { page, limit } = paginationSchema.parse(req.query);

    // Tentar pegar sessão do usuário (opcional)
    let currentUser: { id: string; cidade?: string | null; estado?: string | null; genero_musical?: string | null } | null = null;
    try {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      if (session) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, cidade: true, estado: true, genero_musical: true },
        });
        currentUser = user;
      }
    } catch {}

    const where: any = { tipo_usuario: "artista" };
    if (currentUser) where.id = { not: currentUser.id };

    const artistas = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        image: true,
        tipo_usuario: true,
        genero_musical: true,
        cidade: true,
        estado: true,
        descricao: true,
        preco_minimo: true,
        preco_maximo: true,
        avaliacoes_recebidas: {
          select: { nota: true },
        },
      },
    });

    // Scoring
    const scored = artistas.map((a) => {
      let score = 0;
      if (currentUser?.cidade && a.cidade === currentUser.cidade) score += 3;
      if (currentUser?.estado && a.estado === currentUser.estado) score += 2;
      if (currentUser?.genero_musical && a.genero_musical === currentUser.genero_musical) score += 2;

      const notas = a.avaliacoes_recebidas.map((av) => av.nota);
      const media = notas.length > 0 ? notas.reduce((s, n) => s + n, 0) / notas.length : 0;
      score += media;

      // Random factor para dar exposição a artistas novos
      score += Math.random() * 2;

      return {
        id: a.id,
        name: a.name,
        image: a.image,
        tipo_usuario: a.tipo_usuario,
        genero_musical: a.genero_musical,
        cidade: a.cidade,
        estado: a.estado,
        descricao: a.descricao,
        preco_minimo: a.preco_minimo,
        preco_maximo: a.preco_maximo,
        media_avaliacoes: Math.round(media * 10) / 10,
        total_avaliacoes: notas.length,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const start = (page - 1) * limit;
    const paginated = scored.slice(start, start + limit);

    // Remover score do response
    const data = paginated.map(({ score, ...rest }) => rest);

    return reply.send({
      success: true,
      data,
      meta: { total: scored.length, page, limit },
    });
  });
}
