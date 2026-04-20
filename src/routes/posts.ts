import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import {
  createPostSchema,
  updatePostSchema,
  createComentarioSchema,
  feedQuerySchema,
  cursorPaginationSchema,
} from "../lib/schemas.js";
import { redisGet, redisSetEx } from "../lib/redis.js";

const FEED_FIRST_PAGE_CACHE_TTL_SECONDS = Number(
  process.env.REDIS_FEED_FIRST_TTL_SECONDS ?? 60 * 60 * 6,
);

type FeedFirstPageCache = {
  postIds: string[];
  nextCursor: string | null;
  hasMore: boolean;
};

function getFeedFirstPageCacheKey(userId: string) {
  return `feed:recomendado:first-page:${userId}`;
}

async function getCachedFeedFirstPage(
  userId: string,
): Promise<FeedFirstPageCache | null> {
  const raw = await redisGet(getFeedFirstPageCacheKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<FeedFirstPageCache>;
    if (!Array.isArray(parsed.postIds)) return null;
    if (typeof parsed.hasMore !== "boolean") return null;
    if (parsed.nextCursor !== null && typeof parsed.nextCursor !== "string")
      return null;

    return {
      postIds: parsed.postIds.filter(
        (id): id is string => typeof id === "string",
      ),
      nextCursor: parsed.nextCursor,
      hasMore: parsed.hasMore,
    };
  } catch {
    return null;
  }
}

async function setCachedFeedFirstPage(
  userId: string,
  page: FeedFirstPageCache,
) {
  if (!page.postIds.length) return;

  await redisSetEx(
    getFeedFirstPageCacheKey(userId),
    JSON.stringify(page),
    FEED_FIRST_PAGE_CACHE_TTL_SECONDS,
  );
}

const autorSelect = {
  id: true,
  name: true,
  image: true,
  tipo_usuario: true,
  genero_musical: true,
  cidade: true,
  estado: true,
};

export async function postsRoutes(app: FastifyInstance) {
  const buildRecommendedFeedPage = async ({
    userId,
    cursor,
    limit,
  }: {
    userId: string;
    cursor?: string;
    limit: number;
  }) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cidade: true, estado: true, genero_musical: true },
    });

    const baseWhere: any = {
      visibilidade: "publico",
      id_autor: { not: userId },
      deleted_at: null,
    };

    const tier1 = await prisma.post.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: { ...baseWhere, cidade: user?.cidade ?? undefined },
      orderBy: { created_at: "desc" },
      include: { autor: { select: autorSelect } },
    });

    if (tier1.length > limit) {
      tier1.pop();
      return {
        posts: tier1,
        nextCursor: tier1[tier1.length - 1].id,
        hasMore: true,
      };
    }

    const existingIds = tier1.map((p) => p.id);
    const remaining = limit - tier1.length;

    const tier2 = await prisma.post.findMany({
      take: remaining + 1,
      where: {
        ...baseWhere,
        estado: user?.estado ?? undefined,
        id: { notIn: existingIds },
      },
      orderBy: { created_at: "desc" },
      include: { autor: { select: autorSelect } },
    });

    const combined = [...tier1, ...tier2.slice(0, remaining)];
    const hasMore = tier2.length > remaining;

    if (combined.length >= limit || !hasMore) {
      const nextCursor = hasMore ? combined[combined.length - 1]?.id : null;
      return { posts: combined.slice(0, limit), nextCursor, hasMore };
    }

    const allIds = combined.map((p) => p.id);
    const remaining2 = limit - combined.length;

    const tier3 = await prisma.post.findMany({
      take: remaining2 + 1,
      where: { ...baseWhere, id: { notIn: allIds } },
      orderBy: { created_at: "desc" },
      include: { autor: { select: autorSelect } },
    });

    const final = [...combined, ...tier3.slice(0, remaining2)];
    const finalHasMore = tier3.length > remaining2;
    const nextCursor = finalHasMore ? final[final.length - 1]?.id : null;

    return {
      posts: final,
      nextCursor,
      hasMore: finalHasMore,
    };
  };

  // ── Feed público (cursor-based) ──
  app.get("/", async (req, reply) => {
    const query = feedQuerySchema.parse(req.query);
    const { cursor, limit, tipo, genero, cidade, estado, tag } = query;

    const where: any = { visibilidade: "publico", deleted_at: null };
    if (tipo) where.tipo = tipo;
    if (cidade) where.cidade = { contains: cidade, mode: "insensitive" };
    if (estado) where.estado = estado;
    if (tag) where.tags = { has: tag };
    if (genero)
      where.autor = {
        genero_musical: { contains: genero, mode: "insensitive" },
      };

    const posts = await prisma.post.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where,
      orderBy: { created_at: "desc" },
      include: { autor: { select: autorSelect } },
    });

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();
    const nextCursor = hasMore ? posts[posts.length - 1].id : null;

    return reply.send({
      success: true,
      data: posts,
      meta: { nextCursor, hasMore },
    });
  });

  // ── Feed recomendado (autenticado) ──
  app.get(
    "/feed/recomendados",
    { preHandler: authenticate },
    async (req, reply) => {
      const { cursor, limit } = cursorPaginationSchema.parse(req.query);
      const userId = req.user!.id;

      if (!cursor) {
        const cached = await getCachedFeedFirstPage(userId);
        if (cached && cached.postIds.length > 0) {
          const cachedPosts = await prisma.post.findMany({
            where: {
              id: { in: cached.postIds },
              visibilidade: "publico",
              id_autor: { not: userId },
            },
            include: { autor: { select: autorSelect } },
          });

          const postMap = new Map(cachedPosts.map((post) => [post.id, post]));
          const orderedCachedPosts = cached.postIds
            .map((id) => postMap.get(id))
            .filter(Boolean);

          if (orderedCachedPosts.length === cached.postIds.length) {
            return reply.send({
              success: true,
              data: orderedCachedPosts,
              meta: { nextCursor: cached.nextCursor, hasMore: cached.hasMore },
            });
          }
        }
      }

      const page = await buildRecommendedFeedPage({
        userId,
        cursor: cursor ?? undefined,
        limit,
      });

      if (!cursor) {
        await setCachedFeedFirstPage(userId, {
          postIds: page.posts.map((post) => post.id),
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        });
      }

      return reply.send({
        success: true,
        data: page.posts,
        meta: { nextCursor: page.nextCursor, hasMore: page.hasMore },
      });
    },
  );

  // ── Posts de um usuário ──
  app.get("/usuario/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { cursor, limit } = cursorPaginationSchema.parse(req.query);

    const posts = await prisma.post.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: { id_autor: id, visibilidade: "publico", deleted_at: null },
      orderBy: { created_at: "desc" },
      include: { autor: { select: autorSelect } },
    });

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();
    const nextCursor = hasMore ? posts[posts.length - 1].id : null;

    return reply.send({
      success: true,
      data: posts,
      meta: { nextCursor, hasMore },
    });
  });

  // ── Post por ID ──
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { autor: { select: autorSelect } },
    });

    if (!post || post.deleted_at)
      return reply
        .status(404)
        .send({ success: false, error: "Post não encontrado" });

    // Se autenticado, verificar se curtiu
    let curtiu = false;
    try {
      const session = await import("../lib/auth.js").then((m) =>
        m.auth.api.getSession({ headers: req.headers as any }),
      );
      if (session) {
        const like = await prisma.curtida.findUnique({
          where: {
            id_usuario_id_post: {
              id_usuario: session.user.id,
              id_post: post.id,
            },
          },
        });
        curtiu = !!like;
      }
    } catch {}

    return reply.send({ success: true, data: { ...post, curtiu } });
  });

  // ── Criar post ──
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const body = createPostSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: body.error.issues[0]?.message ?? "Dados inválidos",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { cidade: true, estado: true },
    });

    const post = await prisma.post.create({
      data: {
        ...body.data,
        id_autor: req.user!.id,
        cidade: body.data.cidade ?? user?.cidade ?? null,
        estado: body.data.estado ?? user?.estado ?? null,
        imagens: body.data.imagens ?? [],
        tags: body.data.tags ?? [],
      },
      include: { autor: { select: autorSelect } },
    });

    return reply.status(201).send({ success: true, data: post });
  });

  // ── Atualizar post ──
  app.put<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      const body = updatePostSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: body.error.issues[0]?.message ?? "Dados inválidos",
        });
      }

      const post = await prisma.post.findUnique({
        where: { id: req.params.id },
      });
      if (!post)
        return reply
          .status(404)
          .send({ success: false, error: "Post não encontrado" });
      if (post.id_autor !== req.user!.id)
        return reply
          .status(403)
          .send({ success: false, error: "Sem permissão" });

      const updated = await prisma.post.update({
        where: { id: req.params.id },
        data: body.data,
        include: { autor: { select: autorSelect } },
      });

      return reply.send({ success: true, data: updated });
    },
  );

  /*
  // ── Deletar post ──
  app.delete<{ Params: { id: string } }>("/:id", { preHandler: authenticate }, async (req, reply) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return reply.status(404).send({ success: false, error: "Post não encontrado" });
    if (post.id_autor !== req.user!.id) return reply.status(403).send({ success: false, error: "Sem permissão" });

    await prisma.post.delete({ where: { id: req.params.id } });

    return reply.send({ success: true, message: "Post deletado" });
  });

  */

  // ── Deletar post (Soft Delete) ──
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      const post = await prisma.post.findUnique({
        where: { id: req.params.id },
      });

      // Só permite deletar se o post existir e ainda não tiver sido deletado
      if (!post || post.deleted_at) {
        return reply
          .status(404)
          .send({ success: false, error: "Post não encontrado" });
      }

      if (post.id_autor !== req.user!.id) {
        return reply
          .status(403)
          .send({ success: false, error: "Sem permissão" });
      }

      // Atualiza a data de exclusão
      await prisma.post.update({
        where: { id: req.params.id },
        data: { deleted_at: new Date() },
      });

      // Critério de aceitação: Retornar 204
      return reply.status(204).send();
    },
  );

  // ── Curtir post ──
  app.post<{ Params: { id: string } }>(
    "/:id/curtir",
    { preHandler: authenticate },
    async (req, reply) => {
      const postId = req.params.id;
      const userId = req.user!.id;

      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post || post.deleted_at)
        return reply
          .status(404)
          .send({ success: false, error: "Post não encontrado" });

      const existing = await prisma.curtida.findUnique({
        where: { id_usuario_id_post: { id_usuario: userId, id_post: postId } },
      });
      if (existing)
        return reply
          .status(409)
          .send({ success: false, error: "Já curtiu este post" });

      await prisma.$transaction([
        prisma.curtida.create({
          data: { id_usuario: userId, id_post: postId },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { curtidas_count: { increment: 1 } },
        }),
      ]);

      return reply.send({ success: true, message: "Post curtido" });
    },
  );

  // ── Descurtir post ──
  app.delete<{ Params: { id: string } }>(
    "/:id/curtir",
    { preHandler: authenticate },
    async (req, reply) => {
      const postId = req.params.id;
      const userId = req.user!.id;

      const existing = await prisma.curtida.findUnique({
        where: { id_usuario_id_post: { id_usuario: userId, id_post: postId } },
      });
      if (!existing)
        return reply
          .status(404)
          .send({ success: false, error: "Você não curtiu este post" });

      await prisma.$transaction([
        prisma.curtida.delete({ where: { id: existing.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { curtidas_count: { decrement: 1 } },
        }),
      ]);

      return reply.send({ success: true, message: "Curtida removida" });
    },
  );

  // ── Listar comentários de um post ──
  app.get<{ Params: { id: string } }>(
    "/:id/comentarios",
    async (req, reply) => {
      const { cursor, limit } = cursorPaginationSchema.parse(req.query);

      const comentarios = await prisma.comentario.findMany({
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        where: { id_post: req.params.id, id_comentario_pai: null },
        orderBy: { created_at: "desc" },
        include: {
          autor: { select: autorSelect },
          respostas: {
            take: 3,
            orderBy: { created_at: "asc" },
            include: { autor: { select: autorSelect } },
          },
        },
      });

      const hasMore = comentarios.length > limit;
      if (hasMore) comentarios.pop();
      const nextCursor = hasMore
        ? comentarios[comentarios.length - 1].id
        : null;

      return reply.send({
        success: true,
        data: comentarios,
        meta: { nextCursor, hasMore },
      });
    },
  );

  // ── Respostas de um comentário ──
  app.get<{ Params: { id: string; comentarioId: string } }>(
    "/:id/comentarios/:comentarioId/respostas",
    async (req, reply) => {
      const { cursor, limit } = cursorPaginationSchema.parse(req.query);

      const respostas = await prisma.comentario.findMany({
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        where: { id_comentario_pai: req.params.comentarioId },
        orderBy: { created_at: "asc" },
        include: { autor: { select: autorSelect } },
      });

      const hasMore = respostas.length > limit;
      if (hasMore) respostas.pop();
      const nextCursor = hasMore ? respostas[respostas.length - 1].id : null;

      return reply.send({
        success: true,
        data: respostas,
        meta: { nextCursor, hasMore },
      });
    },
  );

  // ── Criar comentário ──
  app.post<{ Params: { id: string } }>(
    "/:id/comentarios",
    { preHandler: authenticate },
    async (req, reply) => {
      const body = createComentarioSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: body.error.issues[0]?.message ?? "Dados inválidos",
        });
      }

      const post = await prisma.post.findUnique({
        where: { id: req.params.id },
      });
      if (!post || post.deleted_at) {
        return reply
          .status(404)
          .send({ success: false, error: "Post não encontrado" });
      }

      if (body.data.id_comentario_pai) {
        const pai = await prisma.comentario.findUnique({
          where: { id: body.data.id_comentario_pai },
        });
        if (!pai || pai.id_post !== req.params.id) {
          return reply
            .status(400)
            .send({ success: false, error: "Comentário pai inválido" });
        }
      }

      const [comentario] = await prisma.$transaction([
        prisma.comentario.create({
          data: {
            id_autor: req.user!.id,
            id_post: req.params.id,
            conteudo: body.data.conteudo,
            id_comentario_pai: body.data.id_comentario_pai ?? null,
          },
          include: { autor: { select: autorSelect } },
        }),
        prisma.post.update({
          where: { id: req.params.id },
          data: { comentarios_count: { increment: 1 } },
        }),
      ]);

      return reply.status(201).send({ success: true, data: comentario });
    },
  );

  // ── Deletar comentário ──
  app.delete<{ Params: { id: string; comentarioId: string } }>(
    "/:id/comentarios/:comentarioId",
    { preHandler: authenticate },
    async (req, reply) => {
      const comentario = await prisma.comentario.findUnique({
        where: { id: req.params.comentarioId },
      });
      if (!comentario || comentario.id_post !== req.params.id) {
        return reply
          .status(404)
          .send({ success: false, error: "Comentário não encontrado" });
      }
      if (comentario.id_autor !== req.user!.id) {
        return reply
          .status(403)
          .send({ success: false, error: "Sem permissão" });
      }

      // Contar respostas para decrementar corretamente
      const respostasCount = await prisma.comentario.count({
        where: { id_comentario_pai: comentario.id },
      });

      await prisma.$transaction([
        prisma.comentario.delete({ where: { id: comentario.id } }),
        prisma.post.update({
          where: { id: req.params.id },
          data: { comentarios_count: { decrement: 1 + respostasCount } },
        }),
      ]);

      return reply.send({ success: true, message: "Comentário deletado" });
    },
  );
}
