import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const UPLOAD_DIR = path.resolve("public/uploads");
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadsRoutes(app: FastifyInstance) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  app.post<{ Body: unknown }>(
    "/",
    {
      preHandler: authenticate,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const data = await req.file();

      if (!data) {
        return reply
          .status(400)
          .send({ success: false, error: "Nenhum arquivo enviado" });
      }

      if (!ALLOWED_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: "Tipo de arquivo não suportado. Use JPEG, PNG ou WebP",
        });
      }

      const buffer = await data.toBuffer();

      if (buffer.byteLength > MAX_SIZE_BYTES) {
        return reply.status(400).send({
          success: false,
          error: "Arquivo muito grande. Máximo permitido: 5MB",
        });
      }

      const ext = data.mimetype === "image/png" ? "png" : data.mimetype === "image/webp" ? "webp" : "jpg";
      const filename = `${crypto.randomUUID()}.${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      await fs.writeFile(filepath, buffer);

      const protocol = (req.headers["x-forwarded-proto"] as string) ?? "http";
      const host = req.headers.host ?? `localhost:3001`;
      const url = `${protocol}://${host}/uploads/${filename}`;

      return reply.status(201).send({ success: true, data: { url } });
    },
  );
}
