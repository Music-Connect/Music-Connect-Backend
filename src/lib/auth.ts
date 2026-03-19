import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[dev] Reset de senha para ${user.email}: ${url}`);
      }
      // TODO: configurar provider de email (Resend, SendGrid, etc.) para produção
    },
  },
  user: {
    additionalFields: {
      tipo_usuario: {
        type: "string",
        required: true,
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
  trustedOrigins: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
});
