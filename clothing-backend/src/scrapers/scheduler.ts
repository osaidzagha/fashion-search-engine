import cron from "node-cron";
import { runAllScrapers } from "./scraperManager";
export const startScraperCron = () => {
  console.log(
    "⏱️  Scraper Cron Job Initialized. Waiting for scheduled time (3:00 AM)...",
  );

  // The schedule string "0 3 * * *" translates to 3:00 AM every day
  cron.schedule("0 3 * * *", async () => {
    console.log(
      "⏰ CRON TRIGGERED: Starting nightly fashion pipeline at 3:00 AM...",
    );

    try {
      await runAllScrapers();
      console.log("✅ CRON SUCCESS: Nightly pipeline finished successfully.");
    } catch (error) {
      console.error("❌ CRON FAILED: Nightly pipeline crashed:", error);
    }
  });
};
