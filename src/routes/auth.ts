import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { hashPassword, comparePassword, generateToken, generateResetToken, hashResetToken } from "../utils/auth.js";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../lib/schemas.js";
import { z } from "zod";

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post("/register", async (req, reply) => {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const { usuario, email, senha, tipo_usuario, telefone, cidade, estado, descricao, genero_musical } = body.data;

    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) {
      return reply.status(400).send({ success: false, error: "Email já cadastrado" });
    }

    const senhaHash = await hashPassword(senha);

    const user = await prisma.usuario.create({
      data: { usuario, email, senha: senhaHash, tipo_usuario, telefone, cidade, estado, descricao, genero_musical },
    });

    const { senha: _, ...userSemSenha } = user;
    const token = await generateToken({ id_usuario: user.id_usuario, email: user.email, tipo_usuario: user.tipo_usuario });

    reply.setCookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 });

    return reply.status(201).send({ success: true, user: userSemSenha, token, type: user.tipo_usuario });
  });

  // POST /api/auth/login
  app.post("/login", async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const { email, senha } = body.data;

    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user || !(await comparePassword(senha, user.senha))) {
      return reply.status(401).send({ success: false, error: "Credenciais inválidas" });
    }

    const { senha: _, ...userSemSenha } = user;
    const token = await generateToken({ id_usuario: user.id_usuario, email: user.email, tipo_usuario: user.tipo_usuario });

    reply.setCookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 });

    return reply.send({ success: true, user: userSemSenha, token, type: user.tipo_usuario });
  });

  // POST /api/auth/logout
  app.post("/logout", async (req, reply) => {
    reply.clearCookie("token");
    return reply.send({ success: true, message: "Logout realizado com sucesso" });
  });

  // POST /api/auth/forgot-password
  app.post("/forgot-password", async (req, reply) => {
    const body = forgotPasswordSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const { email } = body.data;
    const user = await prisma.usuario.findUnique({ where: { email }, select: { id_usuario: true, email: true } });

    if (!user) {
      return reply.send({ success: true, message: "Se o email existir, você receberá instruções para redefinir sua senha" });
    }

    const resetToken = generateResetToken();
    const hashedToken = hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.deleteMany({ where: { id_usuario: user.id_usuario } });
    await prisma.passwordResetToken.create({ data: { id_usuario: user.id_usuario, token: hashedToken, expires_at: expiresAt } });

    if (process.env.NODE_ENV !== "production") {
      return reply.send({ success: true, message: "Se o email existir, você receberá instruções", resetToken });
    }

    return reply.send({ success: true, message: "Se o email existir, você receberá instruções para redefinir sua senha" });
  });

  // POST /api/auth/reset-password
  app.post("/reset-password", async (req, reply) => {
    const body = resetPasswordSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const { token, novaSenha } = body.data;
    const hashedToken = hashResetToken(token);

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { token: hashedToken, used: false, expires_at: { gt: new Date() } },
    });

    if (!tokenRecord) {
      return reply.status(400).send({ success: false, error: "Token inválido ou expirado" });
    }

    const senhaHash = await hashPassword(novaSenha);
    await prisma.usuario.update({ where: { id_usuario: tokenRecord.id_usuario }, data: { senha: senhaHash } });
    await prisma.passwordResetToken.update({ where: { id: tokenRecord.id }, data: { used: true } });

    return reply.send({ success: true, message: "Senha alterada com sucesso" });
  });
}
