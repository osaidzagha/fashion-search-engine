import { Queue } from "bullmq";
import IORedis from "ioredis";

// ─── Shared Redis Connection ──────────────────────────────────────────────────
// maxRetriesPerRequest: null is required by BullMQ — do not remove.
export const redisConnection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
    tls: {
      rejectUnauthorized: false, // 👈 ADD THIS: Tells Node to accept the Upstash cert
    },
  },
);

redisConnection.on("connect", () => console.log("✅ Redis connected"));
redisConnection.on("error", (err) =>
  console.error("❌ Redis error:", err.message),
);

// ─── Price Alert Queue ────────────────────────────────────────────────────────
export interface PriceAlertJobData {
  brandName: string;
  runId: string;
}

export const priceAlertQueue = new Queue<PriceAlertJobData>("price-alerts", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    // Keep a rolling window of job history in Redis — prevents unbounded growth
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
