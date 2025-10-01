import { createClient } from "redis";

const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = process.env.REDIS_PORT || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redisUrl = process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;

export const redisClient = createClient({
  url: redisUrl,
  password: redisPassword,
});

let isConnected = false;

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

redisClient.on("disconnect", () => {
  isConnected = false;
});

redisClient.on("connect", () => {
  isConnected = true;
  console.log("Conectado a Redis");
});

export async function ensureRedisConnection() {
  if (isConnected && redisClient.isOpen) {
    return redisClient;
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
    isConnected = true;
  }

  return redisClient;
}

export async function quitRedis() {
  if (redisClient.isOpen) {
    await redisClient.quit();
    isConnected = false;
  }
}

