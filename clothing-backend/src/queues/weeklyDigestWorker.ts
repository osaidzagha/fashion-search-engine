import { Worker, Job } from "bullmq";
import { redisConnection } from "./queues";
import { UserModel } from "../models/User";
import { ProductModel } from "../models/Product";
import { sendWeeklyDigestEmail } from "../utils/sendEmail";

const DIGEST_TOP_N = 5;

export const weeklyDigestWorker = new Worker(
  "weekly-digest",
  async (job: Job) => {
    console.log("📬 Running weekly digest job...");

    // Top N deals by discount % updated in the last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const topDeals = await ProductModel.aggregate([
      {
        $match: {
          originalPrice: { $exists: true, $ne: null, $gt: 0 },
          $expr: { $gt: ["$originalPrice", "$price"] },
          updatedAt: { $gte: oneWeekAgo },
          available: { $ne: false },
        },
      },
      {
        $addFields: {
          dropPct: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ["$originalPrice", "$price"] },
                  "$originalPrice",
                ],
              },
              100,
            ],
          },
        },
      },
      { $sort: { dropPct: -1 } },
      { $limit: DIGEST_TOP_N },
      {
        $project: {
          name: 1,
          brand: 1,
          link: 1,
          price: 1,
          originalPrice: 1,
          currency: 1,
        },
      },
    ]);

    if (topDeals.length === 0) {
      console.log("📬 No qualifying deals this week — skipping digest.");
      return;
    }

    const deals = topDeals.map((p: any) => ({
      name: p.name,
      brand: p.brand,
      link: p.link,
      price: p.price,
      originalPrice: p.originalPrice,
      currency: p.currency,
    }));

    // All verified users with alerts enabled
    const users = await UserModel.find({
      isVerified: true,
      "preferences.priceAlertEnabled": { $ne: false },
    })
      .select("email")
      .lean();

    console.log(`📬 Sending digest to ${users.length} users...`);

    // Send in batches of 50 to avoid overwhelming Brevo
    const BATCH = 50;
    for (let i = 0; i < users.length; i += BATCH) {
      await Promise.all(
        users.slice(i, i + BATCH).map((u: any) =>
          sendWeeklyDigestEmail(u.email, deals).catch((e) =>
            console.error(`📬 Failed digest for ${u.email}:`, e.message),
          ),
        ),
      );
    }

    console.log(`📬 Weekly digest complete — sent to ${users.length} users.`);
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

weeklyDigestWorker.on("failed", (job, err) => {
  console.error(`📬 [weeklyDigestWorker] Job failed:`, err.message);
});
