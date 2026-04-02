import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { updateUsuarioSchema } from "../lib/schemas.js";

export async function usuariosRoutes(app: FastifyInstance) {
  // GET /api/usuarios/me
  app.get("/me", { preHandler: authenticate }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user)
      return reply.status(404).send({ success: false, error: "Usuário não encontrado" });

    return reply.send({ success: true, data: user });
  });

  // GET /api/usuarios/:id
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });

    if (!user)
      return reply.status(404).send({ success: false, error: "Usuário não encontrado" });

    return reply.send({ success: true, data: user });
  });

  // PUT /api/usuarios/:id
  app.put<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      if (req.user!.id !== req.params.id) {
        return reply.status(403).send({
          success: false,
          error: "Você não pode atualizar outro usuário",
        });
      }

      const body = updateUsuarioSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: body.error.issues[0]?.message ?? "Dados inválidos",
        });
      }

      const dataToUpdate = {
        name: body.data.name,
        descricao: body.data.descricao,
        telefone: body.data.telefone,
        cidade: body.data.cidade,
        estado: body.data.estado,
      };

      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: dataToUpdate,
      });

      return reply.send({ success: true, data: updated });
    },
  );

  // DELETE /api/usuarios/:id
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      if (req.user!.id !== req.params.id) {
        return reply.status(403).send({
          success: false,
          error: "Você não pode deletar outro usuário",
        });
      }

      await prisma.user.delete({ where: { id: req.params.id } });
      return reply.send({ success: true, message: "Usuário deletado com sucesso" });
    },
  );
}
