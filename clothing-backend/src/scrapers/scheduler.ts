// src/scrapers/scheduler.ts
import cron from "node-cron";
import { runAllScrapers } from "./scraperManager";
import { Queue } from "bullmq";
import { redisConnection } from "../queues/queues";

const weeklyDigestQueue = new Queue("weekly-digest", {
  connection: redisConnection,
});

export const startScraperCron = () => {
  console.log(
    "⏱️  Scraper Cron Job Initialized. Waiting for scheduled time (3:00 AM)...",
  );

  cron.schedule(
    "0 3 * * *",
    async () => {
      console.log(
        "⏰ CRON TRIGGERED: Starting nightly fashion pipeline at 3:00 AM...",
      );

      try {
        await runAllScrapers();
        console.log("✅ CRON SUCCESS: Nightly pipeline finished successfully.");
      } catch (error) {
        console.error("❌ CRON FAILED: Nightly pipeline crashed:", error);
      }
    },
    {
      timezone: "Europe/Istanbul",
    },
  );

  // Weekly digest — every Sunday at 10:00 AM Istanbul time
  cron.schedule(
    "0 10 * * 0",
    async () => {
      console.log("📬 CRON: Queuing weekly digest job...");
      try {
        await weeklyDigestQueue.add("weekly-digest", {}, {
          attempts: 2,
          backoff: { type: "fixed", delay: 60_000 },
        });
        console.log("📬 Weekly digest job queued.");
      } catch (err) {
        console.error("📬 Failed to queue weekly digest:", err);
      }
    },
    { timezone: "Europe/Istanbul" },
  );
};
