import { Queue } from "bullmq";
import IORedis from "ioredis";

// ─── Shared Redis Connection ──────────────────────────────────────────────────
export const redisConnection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
    family: 4, // Prevents DNS IPv6 resolution crashes
    keepAlive: 10000,
    tls: process.env.REDIS_URL?.startsWith("rediss://")
      ? { rejectUnauthorized: false }
      : undefined,
    retryStrategy: (times) => {
      console.warn(
        `⚠️ Redis connection dropped. Reconnecting... (Attempt ${times})`,
      );
      return Math.min(times * 2000, 10000);
    },
  },
);

redisConnection.on("connect", () => console.log("✅ Redis connected"));
redisConnection.on("error", (err) => {
  if (err.message.includes("ECONNRESET")) return;
  console.error("❌ Redis error:", err.message);
});

// ─── Queue Payloads (Union Type) ──────────────────────────────────────────────
export interface SendEmailJobData {
  email: string;
  brandName: string;
  productName: string;
  productLink: string;
  oldPrice: number;
  newPrice: number;
  currency: string;
  runId: string;
}

export interface CheckPriceDropsJobData {
  brandName: string;
  runId: string;
}

// Combine them into a Union Type
export type AlertQueuePayload = SendEmailJobData | CheckPriceDropsJobData;

// ─── The Queue ────────────────────────────────────────────────────────────────
export const priceAlertQueue = new Queue<AlertQueuePayload>("price-alerts", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
