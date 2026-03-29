import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string("DATABASE_URL é obrigatório").url(),
  BETTER_AUTH_SECRET: z.string("BETTER_AUTH_SECRET é obrigatório").min(16, "BETTER_AUTH_SECRET deve ter no mínimo 16 caracteres"),
  BETTER_AUTH_URL: z.string("BETTER_AUTH_URL é obrigatório").url(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  FRONTEND_URL: z.string().url().optional(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Variáveis de ambiente inválidas:");
    for (const issue of result.error.issues) {
      console.error(`   → ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
