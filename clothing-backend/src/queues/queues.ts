import { Queue } from "bullmq";
import IORedis from "ioredis";

// ─── Shared Redis Connection ──────────────────────────────────────────────────
export const redisConnection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null, // Required by BullMQ

    // 🛠️ THE FIX 1: Force Node to use IPv4. This instantly stops the 'ENOTFOUND' DNS crashes.
    family: 4,

    // 🛠️ THE FIX 2: Keep-alive ping to stop Upstash from falling asleep
    keepAlive: 10000,

    // Only apply TLS if the URL actually starts with rediss:// (prevents local crashes)
    tls: process.env.REDIS_URL?.startsWith("rediss://")
      ? { rejectUnauthorized: false }
      : undefined,

    // 🛠️ THE FIX 3: The Auto-Resuscitator
    // If the connection drops, this prevents the fatal Node crash and silently reconnects.
    retryStrategy: (times) => {
      console.warn(
        `⚠️ Redis connection dropped by Upstash. Reconnecting... (Attempt ${times})`,
      );
      // Reconnect after 2 seconds, up to a max of 10 seconds
      return Math.min(times * 2000, 10000);
    },
  },
);

redisConnection.on("connect", () => console.log("✅ Redis connected"));
redisConnection.on("error", (err) => {
  // We silence standard ECONNRESET errors here because our retryStrategy handles them!
  if (err.message.includes("ECONNRESET")) return;
  console.error("❌ Redis error:", err.message);
});

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
