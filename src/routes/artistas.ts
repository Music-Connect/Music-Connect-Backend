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
    if (query.genero) where.genero_musical = { contains: query.genero, mode: "insensitive" };
    if (query.cidade) where.cidade = { contains: query.cidade, mode: "insensitive" };
    if (query.estado) where.estado = { equals: query.estado, mode: "insensitive" };
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
    const artista = await prisma.user.findFirst({
      where: { id: req.params.id, tipo_usuario: "artista" },
    });

    if (!artista)
      return reply.status(404).send({ success: false, error: "Artista não encontrado" });

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
  app.put<{ Params: { id: string } }>("/:id", { preHandler: authenticate }, async (req, reply) => {
    if (req.user!.id !== req.params.id) {
      return reply.status(403).send({ success: false, error: "Você não pode atualizar outro artista" });
    }

    const body = updateUsuarioSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: body.data,
    });

    return reply.send({ success: true, data: updated });
  });
}
