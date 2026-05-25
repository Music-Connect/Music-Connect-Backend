import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    const schema = z.object({
      q: z.string().optional(),
      cidade: z.string().optional(),
      genero: z.string().optional(),
      preco_min: z.string().optional().transform(v => v ? Number(v) : undefined),
      preco_max: z.string().optional().transform(v => v ? Number(v) : undefined),
    });

    try {
      const query = schema.parse(request.query);

    let sqlQuery = `SELECT id, name, image, tipo_usuario, cidade, estado, genero_musical, preco_minimo, preco_maximo FROM users WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    // Apenas mostrar artistas na busca para simplificar
    sqlQuery += ` AND tipo_usuario = 'artista'`;

    if (query.q) {
      // Usando o índice trigrama
      sqlQuery += ` AND name % $${paramIndex}`;
      params.push(query.q);
      paramIndex++;
    }

    if (query.cidade) {
      sqlQuery += ` AND cidade ILIKE $${paramIndex}`;
      params.push(`%${query.cidade}%`);
      paramIndex++;
    }

    if (query.genero) {
      sqlQuery += ` AND genero_musical ILIKE $${paramIndex}`;
      params.push(`%${query.genero}%`);
      paramIndex++;
    }

    if (query.preco_min) {
      sqlQuery += ` AND preco_minimo >= $${paramIndex}`;
      params.push(query.preco_min);
      paramIndex++;
    }

    if (query.preco_max) {
      sqlQuery += ` AND (preco_maximo IS NULL OR preco_maximo <= $${paramIndex})`;
      params.push(query.preco_max);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY "createdAt" DESC LIMIT 50`;

    const results = await prisma.$queryRawUnsafe(sqlQuery, ...params);
    return reply.send(results);
    } catch (err) {
      console.error("Erro no /api/search:", err);
      return reply.status(500).send({ error: "Erro interno no servidor de busca." });
    }
  });
};
