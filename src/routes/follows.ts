import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const followsRoutes: FastifyPluginAsync = async (app) => {
  // Seguir usuário
  app.post("/:id/follow", { preHandler: authenticate }, async (request, reply) => {
    const followerId = request.user!.id;
    const { id: followingId } = request.params as { id: string };

    if (followerId === followingId) {
      return reply.status(400).send({ error: "Você não pode seguir você mesmo." });
    }

    try {
      const follow = await prisma.follow.create({
        data: { followerId, followingId },
        include: { follower: { select: { name: true } } }
      });

      // Criar notificação para o usuário seguido
      await prisma.notification.create({
        data: {
          userId: followingId,
          type: "follow",
          title: "Novo Seguidor!",
          content: `${follow.follower.name} começou a seguir você.`,
          link: `/u/${followerId}`,
        }
      });

      return reply.status(201).send({ success: true, follow });
    } catch (err: any) {
      if (err.code === "P2002") { // Prisma unique constraint error
        return reply.status(400).send({ error: "Você já segue este usuário." });
      }
      throw err;
    }
  });

  // Deixar de seguir
  app.delete("/:id/follow", { preHandler: authenticate }, async (request, reply) => {
    const followerId = request.user!.id;
    const { id: followingId } = request.params as { id: string };

    await prisma.follow.deleteMany({
      where: { followerId, followingId },
    });

    return reply.send({ success: true });
  });

  // Listar seguidores
  app.get("/:id/followers", async (request, reply) => {
    const { id } = request.params as { id: string };
    const followers = await prisma.follow.findMany({
      where: { followingId: id },
      include: { follower: { select: { id: true, name: true, image: true, tipo_usuario: true } } },
      orderBy: { created_at: "desc" },
    });
    return reply.send(followers.map(f => f.follower));
  });

  // Listar quem estou seguindo
  app.get("/:id/following", async (request, reply) => {
    const { id } = request.params as { id: string };
    const following = await prisma.follow.findMany({
      where: { followerId: id },
      include: { following: { select: { id: true, name: true, image: true, tipo_usuario: true } } },
      orderBy: { created_at: "desc" },
    });
    return reply.send(following.map(f => f.following));
  });
};
