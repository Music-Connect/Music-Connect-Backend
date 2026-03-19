import { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

export interface AuthUser {
  id: string;
  email: string;
  tipo_usuario: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export const authenticate = async (req: FastifyRequest, reply: FastifyReply) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return reply.status(401).send({ success: false, error: "Não autorizado" });
  }

  req.user = {
    id: session.user.id,
    email: session.user.email,
    tipo_usuario: (session.user as any).tipo_usuario ?? "",
  };
};
