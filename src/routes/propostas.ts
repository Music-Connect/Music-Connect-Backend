import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import {
  createPropostaSchema,
  updatePropostaStatusSchema,
  paginationSchema,
} from "../lib/schemas.js";

const propostaInclude = {
  contratante: { select: { id: true, name: true, image: true } },
  artista: {
    select: { id: true, name: true, image: true, genero_musical: true },
  },
};

export async function propostasRoutes(app: FastifyInstance) {
  // GET /api/propostas/recebidas
  app.get("/recebidas", { preHandler: authenticate }, async (req, reply) => {
    const { page, limit } = paginationSchema.parse(req.query);

    const [propostas, total] = await Promise.all([
      prisma.proposta.findMany({
        where: { id_artista: req.user!.id, deleted_at: null },
        include: propostaInclude,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.proposta.count({
        where: { id_artista: req.user!.id, deleted_at: null },
      }),
    ]);

    return reply.send({
      success: true,
      data: propostas,
      meta: { total, page, limit },
    });
  });

  // GET /api/propostas/enviadas
  app.get("/enviadas", { preHandler: authenticate }, async (req, reply) => {
    const { page, limit } = paginationSchema.parse(req.query);

    const [propostas, total] = await Promise.all([
      prisma.proposta.findMany({
        where: { id_contratante: req.user!.id, deleted_at: null },
        include: propostaInclude,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.proposta.count({
        where: { id_contratante: req.user!.id, deleted_at: null },
      }),
    ]);

    return reply.send({
      success: true,
      data: propostas,
      meta: { total, page, limit },
    });
  });

  // GET /api/propostas/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return reply.status(400).send({ success: false, error: "ID inválido" });

      const proposta = await prisma.proposta.findFirst({
        where: {
          id_proposta: id,
          deleted_at: null,
          OR: [{ id_artista: req.user!.id }, { id_contratante: req.user!.id }],
        },
        include: propostaInclude,
      });

      if (!proposta)
        return reply
          .status(404)
          .send({ success: false, error: "Proposta não encontrada" });

      return reply.send({ success: true, data: proposta });
    },
  );

  // POST /api/propostas
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const body = createPropostaSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: body.error.issues[0]?.message ?? "Dados inválidos",
      });
    }

    const {
      id_artista,
      data_evento,
      hora_evento,
      valor_oferecido,
      duracao_horas,
      ...rest
    } = body.data;
    const id_contratante = req.user!.id;

    if (id_contratante === id_artista) {
      return reply.status(400).send({
        success: false,
        error: "Você não pode enviar proposta para si mesmo",
      });
    }

    const artista = await prisma.user.findFirst({
      where: { id: id_artista, tipo_usuario: "artista" },
    });
    if (!artista)
      return reply
        .status(404)
        .send({ success: false, error: "Artista não encontrado" });

    const proposta = await prisma.proposta.create({
      data: {
        ...rest,
        id_contratante,
        id_artista,
        data_evento: new Date(data_evento),
        valor_oferecido,
        duracao_horas: duracao_horas ?? null,
      },
      include: propostaInclude,
    });

    return reply.status(201).send({ success: true, data: proposta });
  });

  // PUT /api/propostas/:id/status
  app.put<{ Params: { id: string } }>(
    "/:id/status",
    { preHandler: authenticate },
    async (req, reply) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return reply.status(400).send({ success: false, error: "ID inválido" });

      const body = updatePropostaStatusSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: body.error.issues[0]?.message ?? "Dados inválidos",
        });
      }

      const proposta = await prisma.proposta.findUnique({
        where: { id_proposta: id },
      });
      if (!proposta || proposta.deleted_at) {
        return reply
          .status(404)
          .send({ success: false, error: "Proposta não encontrada" });
      }

      if (proposta.id_artista !== req.user!.id) {
        return reply.status(403).send({
          success: false,
          error: "Apenas o artista pode aceitar ou recusar propostas",
        });
      }

      const updated = await prisma.proposta.update({
        where: { id_proposta: id },
        data: body.data,
        include: propostaInclude,
      });

      return reply.send({ success: true, data: updated });
    },
  );

  // ── DELETE /api/propostas/:id (Soft Delete) ──
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return reply.status(400).send({ success: false, error: "ID inválido" });

      // 1. Busca para checar se existe e se não está apagada
      const proposta = await prisma.proposta.findUnique({
        where: { id_proposta: id },
      });

      if (!proposta || proposta.deleted_at) {
        return reply
          .status(404)
          .send({ success: false, error: "Proposta não encontrada" });
      }

      // 2. Apenas os envolvidos podem deletar
      if (
        proposta.id_contratante !== req.user!.id &&
        proposta.id_artista !== req.user!.id
      ) {
        return reply
          .status(403)
          .send({ success: false, error: "Sem permissão" });
      }

      // 3. O Soft Delete (O Update em vez de Delete físico)
      await prisma.proposta.update({
        where: { id_proposta: id },
        data: { deleted_at: new Date() },
      });

      // 4. Retorno 204
      return reply.status(204).send();
    },
  );
}
