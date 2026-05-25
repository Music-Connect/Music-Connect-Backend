import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { wsManager } from "../lib/websocket.js";
import { authenticate } from "../middleware/auth.js";

export const chatRoutes: FastifyPluginAsync = async (app) => {
  // Middleware de autenticação
  app.addHook("preHandler", authenticate);

  // Listar conversas
  app.get("/conversations", async (request, reply) => {
    const userId = request.user!.id;
    const conversations = await prisma.conversation.findMany({
      where: { users: { some: { id: userId } } },
      include: {
        users: { select: { id: true, name: true, image: true, tipo_usuario: true } },
        messages: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
      orderBy: { updated_at: "desc" },
    });
    return reply.send(conversations);
  });

  // Criar ou buscar conversa
  app.post("/conversations", async (request, reply) => {
    const userId = request.user!.id;
    const schema = z.object({ participantId: z.string() });
    const { participantId } = schema.parse(request.body);

    if (userId === participantId) {
      return reply.status(400).send({ error: "Cannot start a conversation with yourself" });
    }

    // Busca conversa existente
    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { users: { some: { id: userId } } },
          { users: { some: { id: participantId } } },
        ],
      },
    });

    if (!conversation) {
      // Cria nova
      conversation = await prisma.conversation.create({
        data: {
          users: { connect: [{ id: userId }, { id: participantId }] },
        },
      });
    }

    return reply.send(conversation);
  });

  // Histórico de mensagens
  app.get("/conversations/:id/messages", async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const conversation = await prisma.conversation.findFirst({
      where: { id, users: { some: { id: userId } } },
    });

    if (!conversation) return reply.status(404).send({ error: "Not found" });

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { created_at: "asc" },
      take: 50, // Idealmente adicionar paginação cursor
    });

    return reply.send(messages);
  });

  // Enviar mensagem
  app.post("/conversations/:id/messages", async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };
    const schema = z.object({ content: z.string().min(1) });
    const { content } = schema.parse(request.body);

    const conversation = await prisma.conversation.findFirst({
      where: { id, users: { some: { id: userId } } },
      include: { users: true },
    });

    if (!conversation) return reply.status(404).send({ error: "Conversation not found" });

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        content,
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { updated_at: new Date() },
    });

    // Enviar via WebSocket para os outros participantes
    const participants = conversation.users.filter((u) => u.id !== userId);
    for (const p of participants) {
      wsManager.sendMessageToUser(p.id, {
        type: "NEW_MESSAGE",
        payload: message,
      });

      // Se quiser notificação de sistema também
      // await prisma.notification.create(...)
    }

    return reply.status(201).send(message);
  });
};
