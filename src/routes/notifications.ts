import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);

  app.get("/", async (request, reply) => {
    const userId = request.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { created_at: "desc" },
      take: 20,
    });
    return reply.send(notifications);
  });

  app.patch("/:id/read", async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) return reply.status(404).send({ error: "Not found" });

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return reply.send(updated);
  });

  app.post("/mark-all-read", async (request, reply) => {
    const userId = request.user!.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return reply.send({ success: true });
  });
};
