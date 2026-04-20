import { createClient } from "redis";

type AppRedisClient = ReturnType<typeof createClient>;

let client: AppRedisClient | null = null;
let connectPromise: Promise<AppRedisClient | null> | null = null;

async function getRedisClient(): Promise<AppRedisClient | null> {
  if (client?.isReady) return client;
  if (connectPromise) return connectPromise;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  connectPromise = (async () => {
    try {
      const redisClient = createClient({ url });
      redisClient.on("error", (error) => {
        console.error("[redis] erro de conexão:", error);
      });

      await redisClient.connect();
      client = redisClient;
      return redisClient;
    } catch (error) {
      console.error("[redis] não foi possível conectar:", error);
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

export async function redisGet(key: string): Promise<string | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const value = await redis.get(key);
    return typeof value === "string" ? value : null;
  } catch (error) {
    console.error("[redis] falha ao buscar chave", key, error);
    return null;
  }
}

export async function redisSetEx(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, value, { EX: ttlSeconds });
  } catch (error) {
    console.error("[redis] falha ao salvar chave", key, error);
  }
}
