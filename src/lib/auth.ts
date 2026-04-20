import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import { env } from "./env.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24,       // renova o cookie a cada 1 dia de uso
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,              // cache local por 5 minutos
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      enabled: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      if (env.NODE_ENV !== "production") {
        console.log(`[dev] Reset de senha para ${user.email}: ${url}`);
      }
      // TODO: configurar provider de email (Resend, SendGrid, etc.) para produção
    },
  },
  user: {
    additionalFields: {
      tipo_usuario: {
        type: "string",
        required: false,
        defaultValue: "",
        input: true,
      },
      telefone: {
        type: "string",
        required: false,
        input: true,
      },
      descricao: {
        type: "string",
        required: false,
        input: true,
      },
      cidade: {
        type: "string",
        required: false,
        input: true,
      },
      estado: {
        type: "string",
        required: false,
        input: true,
      },
      genero_musical: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  trustedOrigins: env.CORS_ORIGIN.split(","),
});
