import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { createAvaliacaoSchema } from "../lib/schemas.js";

export async function avaliacoesRoutes(app: FastifyInstance) {
  // GET /api/avaliacoes/usuario/:id
  app.get<{ Params: { id: string } }>("/usuario/:id", async (req, reply) => {
    const avaliacoes = await prisma.avaliacao.findMany({
      where: { id_avaliado: req.params.id },
      orderBy: { created_at: "desc" },
      include: {
        avaliador: { select: { name: true, image: true } },
      },
    });

    return reply.send({ success: true, data: avaliacoes });
  });

  // GET /api/avaliacoes/usuario/:id/media
  app.get<{ Params: { id: string } }>("/usuario/:id/media", async (req, reply) => {
    const result = await prisma.avaliacao.aggregate({
      where: { id_avaliado: req.params.id },
      _avg: { nota: true },
      _count: { nota: true },
    });

    return reply.send({
      success: true,
      data: {
        media_nota: result._avg.nota ?? 0,
        total_avaliacoes: result._count.nota,
      },
    });
  });

  // POST /api/avaliacoes
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const body = createAvaliacaoSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const { id_avaliado, nota, comentario } = body.data;
    const id_avaliador = req.user!.id;

    if (id_avaliador === id_avaliado) {
      return reply.status(400).send({ success: false, error: "Você não pode avaliar a si mesmo" });
    }

    const propostaAceita = await prisma.proposta.findFirst({
      where: {
        status: "aceita",
        OR: [
          { id_contratante: id_avaliador, id_artista: id_avaliado },
          { id_contratante: id_avaliado, id_artista: id_avaliador },
        ],
      },
    });

    if (!propostaAceita) {
      return reply.status(403).send({ success: false, error: "Avaliação permitida apenas entre usuários com proposta aceita" });
    }

    const avaliacao = await prisma.avaliacao.create({
      data: { id_avaliador, id_avaliado, nota, comentario },
      include: { avaliador: { select: { name: true, image: true } } },
    });

    return reply.status(201).send({ success: true, data: avaliacao });
  });
}
