import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { createStorySchema, cursorPaginationSchema } from "../lib/schemas.js";

const autorSelect = {
  id: true,
  name: true,
  image: true,
  tipo_usuario: true,
  genero_musical: true,
};

export async function storiesRoutes(app: FastifyInstance) {
  // ── Stories ativos (agrupados por usuário) ──
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const userId = req.user!.id;
    const now = new Date();

    // Buscar stories não expirados
    const stories = await prisma.story.findMany({
      where: { expira_em: { gt: now } },
      orderBy: { created_at: "asc" },
      include: {
        autor: { select: autorSelect },
        visualizacoes: {
          where: { id_usuario: userId },
          select: { id: true },
        },
      },
    });

    // Agrupar por usuário
    const grouped = new Map<string, { user: any; stories: any[]; hasUnseen: boolean }>();

    for (const story of stories) {
      const autorId = story.id_autor;
      if (!grouped.has(autorId)) {
        grouped.set(autorId, { user: story.autor, stories: [], hasUnseen: false });
      }
      const group = grouped.get(autorId)!;
      const seen = story.visualizacoes.length > 0;
      group.stories.push({
        id: story.id,
        midia_url: story.midia_url,
        tipo_midia: story.tipo_midia,
        duracao: story.duracao,
        views_count: story.views_count,
        created_at: story.created_at,
        expira_em: story.expira_em,
        visto: seen,
      });
      if (!seen) group.hasUnseen = true;
    }

    // Ordenar: não vistos primeiro, depois por data
    const result = Array.from(grouped.values()).sort((a, b) => {
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      // Próprio usuário primeiro
      if (a.user.id === userId) return -1;
      if (b.user.id === userId) return 1;
      return 0;
    });

    return reply.send({ success: true, data: result });
  });

  // ── Stories de um usuário específico ──
  app.get("/usuario/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const now = new Date();

    const stories = await prisma.story.findMany({
      where: { id_autor: id, expira_em: { gt: now } },
      orderBy: { created_at: "asc" },
      include: { autor: { select: autorSelect } },
    });

    return reply.send({ success: true, data: stories });
  });

  // ── Criar story ──
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const body = createStorySchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const expira_em = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

    const story = await prisma.story.create({
      data: {
        id_autor: req.user!.id,
        midia_url: body.data.midia_url,
        tipo_midia: body.data.tipo_midia,
        duracao: body.data.duracao,
        expira_em,
      },
      include: { autor: { select: autorSelect } },
    });

    return reply.status(201).send({ success: true, data: story });
  });

  // ── Deletar story ──
  app.delete<{ Params: { id: string } }>("/:id", { preHandler: authenticate }, async (req, reply) => {
    const story = await prisma.story.findUnique({ where: { id: req.params.id } });
    if (!story) return reply.status(404).send({ success: false, error: "Story não encontrado" });
    if (story.id_autor !== req.user!.id) return reply.status(403).send({ success: false, error: "Sem permissão" });

    await prisma.story.delete({ where: { id: req.params.id } });

    return reply.send({ success: true, message: "Story deletado" });
  });

  // ── Visualizar story ──
  app.post<{ Params: { id: string } }>("/:id/visualizar", { preHandler: authenticate }, async (req, reply) => {
    const storyId = req.params.id;
    const userId = req.user!.id;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return reply.status(404).send({ success: false, error: "Story não encontrado" });

    const existing = await prisma.storyView.findUnique({
      where: { id_usuario_id_story: { id_usuario: userId, id_story: storyId } },
    });

    if (!existing) {
      await prisma.$transaction([
        prisma.storyView.create({ data: { id_usuario: userId, id_story: storyId } }),
        prisma.story.update({ where: { id: storyId }, data: { views_count: { increment: 1 } } }),
      ]);
    }

    return reply.send({ success: true, message: "Story visualizado" });
  });

  // ── Visualizações de um story (apenas o dono) ──
  app.get<{ Params: { id: string } }>("/:id/visualizacoes", { preHandler: authenticate }, async (req, reply) => {
    const story = await prisma.story.findUnique({ where: { id: req.params.id } });
    if (!story) return reply.status(404).send({ success: false, error: "Story não encontrado" });
    if (story.id_autor !== req.user!.id) {
      return reply.status(403).send({ success: false, error: "Apenas o autor pode ver as visualizações" });
    }

    const { cursor, limit } = cursorPaginationSchema.parse(req.query);

    const views = await prisma.storyView.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: { id_story: req.params.id },
      orderBy: { created_at: "desc" },
      include: { usuario: { select: autorSelect } },
    });

    const hasMore = views.length > limit;
    if (hasMore) views.pop();
    const nextCursor = hasMore ? views[views.length - 1].id : null;

    return reply.send({ success: true, data: views, meta: { nextCursor, hasMore } });
  });
}
