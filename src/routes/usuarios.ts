import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { updateUsuarioSchema } from "../lib/schemas.js";

export async function usuariosRoutes(app: FastifyInstance) {
  // GET /api/usuarios/me
  app.get("/me", { preHandler: authenticate }, async (req, reply) => {
    const user = await prisma.usuario.findUnique({
      where: { id_usuario: req.user!.id_usuario },
    });

    if (!user)
      return reply
        .status(404)
        .send({ success: false, error: "Usuário não encontrado" });

    const { senha, ...userSemSenha } = user;
    return reply.send({ success: true, data: userSemSenha });
  });

  // GET /api/usuarios/:id
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return reply.status(400).send({ success: false, error: "ID inválido" });

    const user = await prisma.usuario.findUnique({ where: { id_usuario: id } });
    if (!user)
      return reply
        .status(404)
        .send({ success: false, error: "Usuário não encontrado" });

    const { senha, ...userSemSenha } = user;
    return reply.send({ success: true, data: userSemSenha });
  });

  // PUT /api/usuarios/:id
  app.put<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return reply.status(400).send({ success: false, error: "ID inválido" });

      if (req.user!.id_usuario !== id) {
        return reply
          .status(403)
          .send({
            success: false,
            error: "Você não pode atualizar outro usuário",
          });
      }

      const body = updateUsuarioSchema.safeParse(req.body);
      if (!body.success) {
        return reply
          .status(400)
          .send({
            success: false,
            error: body.error.issues[0]?.message ?? "Dados inválidos",
          });
      }

      const updated = await prisma.usuario.update({
        where: { id_usuario: id },
        data: body.data,
      });

      const { senha, ...userSemSenha } = updated;
      return reply.send({ success: true, data: userSemSenha });
    },
  );

  // DELETE /api/usuarios/:id
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return reply.status(400).send({ success: false, error: "ID inválido" });

      if (req.user!.id_usuario !== id) {
        return reply
          .status(403)
          .send({
            success: false,
            error: "Você não pode deletar outro usuário",
          });
      }

      await prisma.usuario.delete({ where: { id_usuario: id } });
      return reply.send({
        success: true,
        message: "Usuário deletado com sucesso",
      });
    },
  );
}
