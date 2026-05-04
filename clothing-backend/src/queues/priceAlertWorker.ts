import { Worker, Job } from "bullmq";
import { redisConnection, PriceAlertJobData } from "./queues";
import { ProductModel } from "../models/Product";
import { UserModel } from "../models/User";
import { sendPriceAlertEmail } from "../utils/sendEmail";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DroppedProduct {
  id: string;
  name: string;
  link: string;
  currency: string;
  // The last two priceHistory entries — [older, newer]
  lastTwo: { price: number; date: Date }[];
}

// ─── Core Job Processor ───────────────────────────────────────────────────────
async function processPriceAlerts(
  job: Job<PriceAlertJobData>,
): Promise<{ alertsSent: number; failed: number }> {
  const { brandName } = job.data;
  console.log(`🔔 [PriceAlertWorker] Processing drops for ${brandName}...`);

  // ── Step 1: Find all products from this brand with a run-over-run price drop
  // We use aggregation to slice the last 2 priceHistory entries and compare them.
  // $slice: ["$priceHistory", -2] → [secondToLast, last]
  // We match where last.price < secondToLast.price (a drop occurred).
  const droppedProducts: DroppedProduct[] = await ProductModel.aggregate([
    {
      $match: {
        brand: brandName,
        // Ensure at least 2 history entries exist before slicing
        "priceHistory.1": { $exists: true },
      },
    },
    {
      $addFields: {
        lastTwo: { $slice: ["$priceHistory", -2] },
      },
    },
    {
      $match: {
        $expr: {
          $lt: [
            { $arrayElemAt: ["$lastTwo.price", 1] }, // newest price
            { $arrayElemAt: ["$lastTwo.price", 0] }, // previous price
          ],
        },
      },
    },
    {
      // Projection: only ship the fields the email needs across the wire
      $project: {
        _id: 0,
        id: 1,
        name: 1,
        link: 1,
        currency: 1,
        lastTwo: 1,
      },
    },
  ]);

  if (droppedProducts.length === 0) {
    console.log(`ℹ️  [PriceAlertWorker] No drops for ${brandName} this run.`);
    return { alertsSent: 0, failed: 0 };
  }

  console.log(
    `📉 [PriceAlertWorker] ${droppedProducts.length} product(s) dropped for ${brandName}.`,
  );

  // ── Step 2: Find users who are tracking any of the dropped products
  const droppedIds = droppedProducts.map((p) => p.id);

  const affectedUsers = await UserModel.find(
    { "watchlist.productId": { $in: droppedIds } },
    // Only pull the fields we need — don't hydrate the full user document
    { email: 1, watchlist: 1 },
  ).lean();

  if (affectedUsers.length === 0) {
    console.log(
      `ℹ️  [PriceAlertWorker] No users tracking dropped ${brandName} products.`,
    );
    return { alertsSent: 0, failed: 0 };
  }

  // ── Step 3: Build an O(1) lookup map — product.id → DroppedProduct
  const productMap = new Map<string, DroppedProduct>(
    droppedProducts.map((p) => [p.id, p]),
  );

  // ── Step 4: Fan out — one email per (user × dropped product they track)
  const emailTasks: Promise<void>[] = [];

  for (const user of affectedUsers) {
    for (const watchlistItem of user.watchlist) {
      const product = productMap.get(watchlistItem.productId);
      if (!product) continue; // This user tracks a different product — skip

      const oldPrice = product.lastTwo[0].price; // secondToLast
      const newPrice = product.lastTwo[1].price; // latest (lower)

      emailTasks.push(
        sendPriceAlertEmail(
          user.email,
          product.name,
          product.link,
          oldPrice,
          newPrice,
          product.currency,
        ),
      );
    }
  }

  // allSettled: a single failed email never aborts the rest
  const results = await Promise.allSettled(emailTasks);
  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0) {
    console.warn(
      `⚠️  [PriceAlertWorker] ${failed} email(s) failed to send for ${brandName}.`,
    );
  }

  console.log(
    `✅ [PriceAlertWorker] ${sent} alert(s) dispatched for ${brandName}.`,
  );
  return { alertsSent: sent, failed };
}

// ─── Worker Instance ──────────────────────────────────────────────────────────
// concurrency: 1 — alert jobs are I/O-bound but low-frequency.
// One brand runs at a time; there's no benefit to parallelising here.
export const priceAlertWorker = new Worker<PriceAlertJobData>(
  "price-alerts",
  processPriceAlerts,
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

// ─── Worker Lifecycle Hooks ───────────────────────────────────────────────────
priceAlertWorker.on("completed", (job, result) => {
  console.log(
    `🔔 [PriceAlertWorker] Job ${job.id} complete — ${result.alertsSent} sent, ${result.failed} failed.`,
  );
});

priceAlertWorker.on("failed", (job, err) => {
  console.error(
    `❌ [PriceAlertWorker] Job ${job?.id} failed after all retries: ${err.message}`,
  );
});

priceAlertWorker.on("error", (err) => {
  console.error(`❌ [PriceAlertWorker] Worker error:`, err.message);
});
