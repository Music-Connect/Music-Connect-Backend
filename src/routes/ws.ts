import type { FastifyPluginAsync } from "fastify";
import { wsManager } from "../lib/websocket.js";
import { auth } from "../lib/auth.js";
import cookie from "cookie"; // maybe use cookie parser manually or from fastify

export const wsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { websocket: true }, async (socket, req) => {
    // 1. Extrair token ou cookie de sessão do header para autenticar
    // Better Auth usa cookies `better-auth.session_token`
    const cookieHeader = req.headers.cookie;
    let userId: string | null = null;

    if (cookieHeader) {
      // Re-utilizar a lógica do Better Auth para checar a request
      // Convertendo FastifyRequest para Request padrão do Node/Web
      const url = `http://${req.headers.host}${req.url}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
      const webReq = new Request(url, { headers });
      
      const session = await auth.api.getSession({ headers: webReq.headers });
      if (session?.user) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      socket.send(JSON.stringify({ type: "ERROR", payload: "Unauthorized" }));
      socket.close();
      return;
    }

    wsManager.addConnection(userId, socket);

    socket.on("message", (message) => {
      // Logica para lidar com mensagens recebidas do cliente se necessário.
      // Ex: ping/pong
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "PING") {
          socket.send(JSON.stringify({ type: "PONG" }));
        }
      } catch (err) {
        console.error("Erro no WS:", err);
      }
    });
  });
};
