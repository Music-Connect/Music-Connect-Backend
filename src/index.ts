import "dotenv/config";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { auth } from "./lib/auth.js";
import { usuariosRoutes } from "./routes/usuarios.js";
import { artistasRoutes } from "./routes/artistas.js";
import { propostasRoutes } from "./routes/propostas.js";
import { avaliacoesRoutes } from "./routes/avaliacoes.js";
import { postsRoutes } from "./routes/posts.js";
import { storiesRoutes } from "./routes/stories.js";
import { recomendacoesRoutes } from "./routes/recomendacoes.js";

const app = Fastify({ logger: env.NODE_ENV === "development" });

await app.register(cors, {
  origin: env.CORS_ORIGIN.split(","),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

await app.register(cookie);

app.get("/health", async () => ({ status: "ok", timestamp: new Date() }));

// Better Auth — gerencia todas as rotas /api/auth/*
// Endpoints disponíveis:
//   POST /api/auth/sign-up/email   (registro)
//   POST /api/auth/sign-in/email   (login)
//   POST /api/auth/sign-out        (logout)
//   POST /api/auth/forget-password (esqueci a senha)
//   POST /api/auth/reset-password  (redefinir senha)
//   GET  /api/auth/session         (sessão atual)
app.all("/api/auth/*", async (request, reply) => {
  const host = request.headers.host || `localhost:${env.PORT}`;
  const url = `http://${host}${request.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
    body = JSON.stringify(request.body);
    headers.set("content-type", "application/json");
    headers.set("content-length", Buffer.byteLength(body).toString());
  }

  const webRequest = new Request(url, { method: request.method, headers, body });
  const response = await auth.handler(webRequest);

  reply.status(response.status);

  // Skip CORS headers — @fastify/cors already handles them.
  // Forwarding them from Better Auth causes duplicate headers, which browsers reject.
  const skipHeaders = new Set([
    "access-control-allow-origin",
    "access-control-allow-credentials",
    "access-control-allow-methods",
    "access-control-allow-headers",
    "access-control-expose-headers",
    "vary",
  ]);
  for (const [key, value] of response.headers.entries()) {
    if (!skipHeaders.has(key.toLowerCase())) {
      reply.header(key, value);
    }
  }

  const text = await response.text();
  if (text) {
    try {
      return reply.send(JSON.parse(text));
    } catch {
      return reply.send(text);
    }
  }
  return reply.send();
});

await app.register(usuariosRoutes, { prefix: "/api/usuarios" });
await app.register(artistasRoutes, { prefix: "/api/artistas" });
await app.register(propostasRoutes, { prefix: "/api/propostas" });
await app.register(avaliacoesRoutes, { prefix: "/api/avaliacoes" });
await app.register(postsRoutes, { prefix: "/api/posts" });
await app.register(storiesRoutes, { prefix: "/api/stories" });
await app.register(recomendacoesRoutes, { prefix: "/api/recomendacoes" });

const start = async () => {
  try {
    await prisma.$connect();
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`✅ Backend rodando em http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
