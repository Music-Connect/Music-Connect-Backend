import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "../utils/auth.js";

export interface AuthUser {
  id_usuario: number;
  email: string;
  tipo_usuario: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export const authenticate = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  const token =
    req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return reply.status(401).send({ success: false, error: "Não autorizado" });
  }

  try {
    req.user = await verifyToken(token);
  } catch {
    return reply.status(401).send({ success: false, error: "Token inválido" });
  }
};
