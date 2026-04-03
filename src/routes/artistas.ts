import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { updateUsuarioSchema, paginationSchema } from "../lib/schemas.js";

export async function artistasRoutes(app: FastifyInstance) {
  // GET /api/artistas
  app.get("/", async (req, reply) => {
    const query = req.query as Record<string, string>;
    const { page, limit } = paginationSchema.parse(query);
    const skip = (page - 1) * limit;

    const where: any = { tipo_usuario: "artista" };
    if (query.genero)
      where.genero_musical = { contains: query.genero, mode: "insensitive" };
    if (query.cidade)
      where.cidade = { contains: query.cidade, mode: "insensitive" };
    if (query.estado)
      where.estado = { equals: query.estado, mode: "insensitive" };
    if (query.local) {
      where.OR = [
        { cidade: { contains: query.local, mode: "insensitive" } },
        { estado: { contains: query.local, mode: "insensitive" } },
      ];
    }

    const [artistas, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: artistas,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /api/artistas/:id
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const visitorId = (req as any).user?.id ?? null;

    // Fire-and-forget: sem auto-visita, 1 registro por usuário logado por dia
    if (visitorId !== req.params.id) {
      (async () => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        if (visitorId) {
          const jaVisitou = await prisma.visitaPerfil.findFirst({
            where: {
              id_artista: req.params.id,
              id_visitante: visitorId,
              created_at: { gte: hoje, lt: amanha },
            },
          });
          if (!jaVisitou) {
            await prisma.visitaPerfil.create({
              data: { id_artista: req.params.id, id_visitante: visitorId },
            });
          }
        } else {
          await prisma.visitaPerfil.create({
            data: { id_artista: req.params.id, id_visitante: null },
          });
        }
      })().catch((err) => console.error("Erro ao gravar visita:", err));
    }

    const artista = await prisma.user.findFirst({
      where: { id: req.params.id, tipo_usuario: "artista" },
    });

    if (!artista)
      return reply
        .status(404)
        .send({ success: false, error: "Artista não encontrado" });

    const [avaliacoes, mediaResult] = await Promise.all([
      prisma.avaliacao.findMany({
        where: { id_avaliado: req.params.id },
        orderBy: { created_at: "desc" },
        include: {
          avaliador: { select: { name: true, image: true } },
        },
      }),
      prisma.avaliacao.aggregate({
        where: { id_avaliado: req.params.id },
        _avg: { nota: true },
        _count: { nota: true },
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        ...artista,
        avaliacoes,
        media_avaliacoes: mediaResult._avg.nota ?? 0,
        total_avaliacoes: mediaResult._count.nota,
      },
    });
  });

  // PUT /api/artistas/:id
  app.put<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      if (req.user!.id !== req.params.id) {
        return reply.status(403).send({
          success: false,
          error: "Você não pode atualizar outro artista",
        });
      }

      const body = updateUsuarioSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: body.error.issues[0]?.message ?? "Dados inválidos",
        });
      }

      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: body.data,
      });

      return reply.send({ success: true, data: updated });
    },
  );

  // GET /api/artistas/analytics
  app.get("/analytics", { preHandler: authenticate }, async (req, reply) => {
    const artistaId = req.user!.id;

    if (req.user!.tipo_usuario !== "artista") {
      return reply
        .status(403)
        .send({
          success: false,
          error: "Apenas artistas podem ver o analytics",
        });
    }

    const seteAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, semanal, visitasPorDia] = await Promise.all([
      prisma.visitaPerfil.count({ where: { id_artista: artistaId } }),
      prisma.visitaPerfil.count({
        where: { id_artista: artistaId, created_at: { gte: seteAtras } },
      }),
      prisma.$queryRaw<{ data: string; visitas: number }[]>`
        SELECT
          TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS data,
          COUNT(*)::int AS visitas
        FROM visitas_perfil
        WHERE id_artista = ${artistaId}
          AND created_at >= ${seteAtras}
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
        ORDER BY data ASC
      `,
    ]);

    return reply.send({
      success: true,
      data: { total_visitas: total, visitas_semanais: semanal, visitas_por_dia: visitasPorDia },
    });
  });
}
