import { Worker, Job } from "bullmq";
import {
  redisConnection,
  AlertQueuePayload,
  CheckPriceDropsJobData,
} from "./queues";
import { ProductModel } from "../models/Product";
import { UserModel } from "../models/User";
import { sendPriceAlertEmail } from "../utils/sendEmail";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DroppedProduct {
  id: string;
  name: string;
  link: string;
  currency: string;
  lastTwo: { price: number; date: Date }[];
}

// ─── Sub-Processor: DB Check & Fan-out ────────────────────────────────────────
async function processPriceAlerts(
  job: Job<CheckPriceDropsJobData>,
): Promise<{ alertsSent: number; failed: number }> {
  const { brandName } = job.data;
  console.log(`🔔 [PriceAlertWorker] Processing drops for ${brandName}...`);

  // Step 1: Find drops via Aggregation
  const droppedProducts: DroppedProduct[] = await ProductModel.aggregate([
    {
      $match: {
        brand: brandName,
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
            { $arrayElemAt: ["$lastTwo.price", 1] },
            { $arrayElemAt: ["$lastTwo.price", 0] },
          ],
        },
      },
    },
    {
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

  // Step 2: Find tracking users
  const droppedIds = droppedProducts.map((p) => p.id);
  const affectedUsers = await UserModel.find(
    { "watchlist.productId": { $in: droppedIds } },
    { email: 1, watchlist: 1 },
  ).lean();

  if (affectedUsers.length === 0) {
    console.log(
      `ℹ️  [PriceAlertWorker] No users tracking dropped ${brandName} products.`,
    );
    return { alertsSent: 0, failed: 0 };
  }

  // Step 3: Lookup Map
  const productMap = new Map<string, DroppedProduct>(
    droppedProducts.map((p) => [p.id, p]),
  );

  // Step 4: Batch Process Emails
  const emailTasks: (() => Promise<void>)[] = [];

  for (const user of affectedUsers) {
    for (const watchlistItem of user.watchlist) {
      const product = productMap.get(watchlistItem.productId);
      if (!product) continue;

      const oldPrice = product.lastTwo[0].price;
      const newPrice = product.lastTwo[1].price;

      emailTasks.push(() =>
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

  let sent = 0;
  let failed = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < emailTasks.length; i += BATCH_SIZE) {
    const batch = emailTasks.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((task) => task()));

    sent += results.filter((r) => r.status === "fulfilled").length;
    failed += results.filter((r) => r.status === "rejected").length;

    if (i + BATCH_SIZE < emailTasks.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

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

// ─── The Worker Router ────────────────────────────────────────────────────────
export const priceAlertWorker = new Worker<AlertQueuePayload>(
  "price-alerts",
  // We explicitly tell TS this router returns our custom object
  async (job): Promise<{ alertsSent: number; failed: number }> => {
    // Route 1: The Scraper Drop Check
    if (job.name === "check-price-drops") {
      return await processPriceAlerts(job as Job<CheckPriceDropsJobData>);
    }

    // Route 2: Single Email Fallback (if you ever need to use it directly)
    if (job.name === "price-alert") {
      // Logic for single email goes here if needed in the future
      return { alertsSent: 1, failed: 0 };
    }

    // THE TS(2355) FIX: We throw an error if the job name doesn't match!
    // This tells TypeScript "I will never reach the end of this function without returning or throwing."
    throw new Error(`Unknown job name: ${job.name}`);
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

// ─── Worker Lifecycle Hooks ───────────────────────────────────────────────────
priceAlertWorker.on("completed", (job, result) => {
  console.log(
    `🔔 [PriceAlertWorker] Job ${job.id} complete — ${result?.alertsSent || 0} sent, ${result?.failed || 0} failed.`,
  );
});

priceAlertWorker.on("failed", (job, err) => {
  console.error(`❌ [PriceAlertWorker] Job ${job?.id} failed: ${err.message}`);
});

priceAlertWorker.on("error", (err) => {
  console.error(`❌ [PriceAlertWorker] Worker error:`, err.message);
});
