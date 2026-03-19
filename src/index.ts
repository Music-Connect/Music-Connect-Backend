import "dotenv/config";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { prisma } from "./lib/prisma.js";
import { authRoutes } from "./routes/auth.js";
import { usuariosRoutes } from "./routes/usuarios.js";
import { artistasRoutes } from "./routes/artistas.js";
import { propostasRoutes } from "./routes/propostas.js";
import { avaliacoesRoutes } from "./routes/avaliacoes.js";

const app = Fastify({ logger: process.env.NODE_ENV === "development" });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
});

await app.register(cookie);

app.get("/health", async () => ({ status: "ok", timestamp: new Date() }));

await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(usuariosRoutes, { prefix: "/api/usuarios" });
await app.register(artistasRoutes, { prefix: "/api/artistas" });
await app.register(propostasRoutes, { prefix: "/api/propostas" });
await app.register(avaliacoesRoutes, { prefix: "/api/avaliacoes" });

const start = async () => {
  try {
    await prisma.$connect();
    const PORT = Number(process.env.PORT) || 3001;
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`✅ Backend rodando em http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
