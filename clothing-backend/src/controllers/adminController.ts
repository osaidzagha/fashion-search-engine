import { Request, Response } from "express";
import { ProductModel } from "../models/Product";
import { UserModel } from "../models/User";
import { ProductModel as Product } from "../models/Product";
import { ScraperRunModel, IScraperRun } from "../models/ScraperRun";
import {
  triggerScraper,
  knownBrandSlugs,
  brandNameForSlug,
  stopScraper,
} from "../scrapers/scraperManager";

// ─── Constants ────────────────────────────────────────────────────────────────
const DOW_TO_ABBR: Record<number, string> = {
  1: "Sun",
  2: "Mon",
  3: "Tue",
  4: "Wed",
  5: "Thu",
  6: "Fri",
  7: "Sat",
};
const CHART_DAY_ORDER = [2, 3, 4, 5, 6, 7, 1] as const;

const VIDEO_MATCH = {
  "videos.0": { $exists: true, $nin: ["", null] },
};

const ON_SALE_MATCH = { $expr: { $gt: ["$originalPrice", "$price"] } };
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Formatting helpers ───────────────────────────────────────────────────────
function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatLastRun(date: Date): string {
  const now = new Date();
  const isToday =
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate();
  const time = formatTime(date);
  return isToday
    ? `Today, ${time}`
    : `${date.toLocaleDateString("en-GB")}, ${time}`;
}

function toFrontendStatus(
  status: IScraperRun["status"],
): "idle" | "running" | "error" {
  if (status === "success") return "idle";
  return status;
}

function buildActivityDetail(run: IScraperRun): string {
  if (run.status === "running") return "Running…";
  return `${run.newItems} new · ${run.updatedItems} updated · ${run.errorCount} errors`;
}

function buildActivityEvent(run: IScraperRun): string {
  if (run.status === "running") return "Scrape in progress";
  if (run.status === "success") return "Scrape completed";
  return "Scrape failed";
}

function buildActivityType(run: IScraperRun): "success" | "info" | "error" {
  if (run.status === "running") return "info";
  if (run.status === "success") return "success";
  return "error";
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export const getDashboard = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const oneWeekAgo = new Date(Date.now() - ONE_WEEK_MS);

    // ── Three parallel DB round-trips ────────────────────────────────────────
    const [productFacetResult, userFacetResult, scraperRuns] =
      await Promise.all([
        // A: All product-level stats
        ProductModel.aggregate([
          {
            $facet: {
              totalProducts: [{ $count: "count" }],
              newThisWeek: [
                { $match: { timestamp: { $gte: oneWeekAgo } } },
                { $count: "count" },
              ],
              activeVideos: [{ $match: VIDEO_MATCH }, { $count: "count" }],
              itemsOnSale: [{ $match: ON_SALE_MATCH }, { $count: "count" }],
              priceDropChart: [
                { $match: ON_SALE_MATCH },
                {
                  $group: {
                    _id: { $dayOfWeek: "$timestamp" },
                    drops: { $sum: 1 },
                  },
                },
                { $sort: { _id: 1 } },
              ],
            },
          },
        ]),

        // B: Watchlist stats
        UserModel.aggregate([
          {
            $facet: {
              trackedTotal: [
                {
                  $project: {
                    count: { $size: { $ifNull: ["$watchlist", []] } },
                  },
                },
                { $group: { _id: null, total: { $sum: "$count" } } },
              ],
              topProducts: [
                {
                  $unwind: {
                    path: "$watchlist",
                    preserveNullAndEmptyArrays: false,
                  },
                },
                {
                  $group: { _id: "$watchlist.productId", tracks: { $sum: 1 } },
                },
                { $sort: { tracks: -1 } },
                { $limit: 5 },
              ],
            },
          },
        ]),

        // C: Scraper runs
        ScraperRunModel.aggregate([
          { $sort: { startedAt: -1 } },
          { $limit: 100 },
          {
            $facet: {
              latestPerBrand: [
                { $group: { _id: "$brand", doc: { $first: "$$ROOT" } } },
              ],
              recentRuns: [{ $limit: 20 }],
            },
          },
        ]),
      ]);

    // ── Unpack product facet ─────────────────────────────────────────────────
    const pf = productFacetResult[0];
    const totalProducts = pf.totalProducts[0]?.count ?? 0;
    const newThisWeek = pf.newThisWeek[0]?.count ?? 0;
    const activeVideos = pf.activeVideos[0]?.count ?? 0;
    const itemsOnSale = pf.itemsOnSale[0]?.count ?? 0;

    const dropsByDow = new Map<number, number>(
      (pf.priceDropChart as any[]).map((r) => [r._id, r.drops]),
    );
    const priceDropData = CHART_DAY_ORDER.map((dow) => ({
      day: DOW_TO_ABBR[dow],
      drops: dropsByDow.get(dow) ?? 0,
    }));

    // ── Unpack user facet ────────────────────────────────────────────────────
    const uf = userFacetResult[0];
    const trackedTotal = uf.trackedTotal[0]?.total ?? 0;
    const topEntries = uf.topProducts as { _id: string; tracks: number }[];

    const topIds = topEntries.map((e) => e._id);
    const topDocs = await ProductModel.find(
      { id: { $in: topIds } },
      { id: 1, name: 1, brand: 1, images: 1, _id: 0 },
    ).lean<any[]>();

    const docById = new Map(topDocs.map((d) => [d.id, d]));
    const watchlistTop = topEntries
      .map((entry) => {
        const doc = docById.get(entry._id);
        if (!doc) return null;
        return {
          name: doc.name,
          brand: doc.brand,
          img: doc.images?.[0] ?? "",
          tracks: entry.tracks,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // ── Unpack scraper facet ─────────────────────────────────────────────────
    const sf = scraperRuns[0]; // <-- This is the 'sf' variable that was missing!

    const latestByBrand = new Map<string, IScraperRun>(
      (sf.latestPerBrand as any[]).map(({ _id, doc }) => [_id, doc]),
    );

    // Dynamically generate cards based on the scraperManager registry
    const scraperStatus = knownBrandSlugs().map((slug) => {
      const brand = brandNameForSlug(slug) || slug;
      const run = latestByBrand.get(brand);

      if (!run) {
        return {
          brand,
          status: "idle" as const,
          lastRun: "Never",
          duration: "—",
          newItems: 0,
          updated: 0,
        };
      }

      return {
        brand,
        status: toFrontendStatus(run.status),
        lastRun: formatLastRun(run.startedAt),
        duration: formatDuration(run.durationMs),
        newItems: run.newItems,
        updated: run.updatedItems,
      };
    });

    // ── Restore the Activity Log ─────────────────────────────────────────────
    const activityLog = (sf.recentRuns as IScraperRun[]).map((run) => ({
      time: formatTime(run.startedAt),
      brand: run.brand,
      event: buildActivityEvent(run),
      detail: buildActivityDetail(run),
      type: buildActivityType(run),
    }));
    // The "Nuclear Option" loose query
    const videoProducts = await Product.find({
      videos: { $exists: true, $type: "array", $ne: [] },
    })
      .select("id name brand videos isCampaignHero")
      .limit(50)
      .lean();
    // ── KPI array ────────────────────────────────────────────────────────────
    const salePercent =
      totalProducts > 0
        ? ((itemsOnSale / totalProducts) * 100).toFixed(1)
        : "0.0";
    const kpiData = [
      {
        label: "Total Products",
        value: totalProducts.toLocaleString("en-US"),
        delta: `+${newThisWeek.toLocaleString("en-US")} this week`,
        up: newThisWeek > 0,
      },
      {
        label: "Active Videos",
        value: activeVideos.toLocaleString("en-US"),
        delta: "Real-time query",
        up: true,
      },
      {
        label: "Items on Sale",
        value: itemsOnSale.toLocaleString("en-US"),
        delta: `${salePercent}% of catalogue`,
        up: false,
      },
      {
        label: "Tracked by Users",
        value: trackedTotal.toLocaleString("en-US"),
        delta: "Real-time query",
        up: true,
      },
    ];

    res.json({
      kpiData,
      priceDropData,
      scraperStatus,
      watchlistTop,
      activityLog,
      videoProducts,
    });
  } catch (err) {
    console.error("[AdminController] getDashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard data." });
  }
};

// ─── Trigger Scraper POST Endpoint ────────────────────────────────────────────

export const runScraper = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const input = req.params.brand as string;

    // Smart Match: Check if the input is a slug OR a display name
    const targetSlug = knownBrandSlugs().find(
      (slug) => slug === input || brandNameForSlug(slug) === input,
    );

    if (!targetSlug) {
      res.status(400).json({ error: `Unknown brand: ${input}` });
      return;
    }

    const brandName = brandNameForSlug(targetSlug);

    const runDoc = await ScraperRunModel.create({
      brand: brandName,
      status: "running",
      startedAt: new Date(),
    });

    // We pass the targetSlug to triggerScraper, NOT the display name!
    triggerScraper(targetSlug, runDoc._id.toString(), false);

    res.status(202).json({
      message: `${brandName} scraper started in the background.`,
      runId: runDoc._id,
    });
  } catch (err) {
    console.error("[AdminController] runScraper error:", err);
    res.status(500).json({ error: "Failed to start scraper." });
  }
};

// ─── Kill Scraper DELETE Endpoint ─────────────────────────────────────────────

export const killScraper = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const input = req.params.brand as string;

    // Smart Match: Check if the input is a slug OR a display name
    const targetSlug = knownBrandSlugs().find(
      (slug) => slug === input || brandNameForSlug(slug) === input,
    );

    if (!targetSlug) {
      res.status(400).json({ error: `Unknown brand: ${input}` });
      return;
    }

    // Stop using the slug
    const wasStopped = await stopScraper(targetSlug);
    const brandName = brandNameForSlug(targetSlug) || input;

    // Immediately update the DB so the frontend stops polling
    await ScraperRunModel.findOneAndUpdate(
      { brand: brandName, status: "running" },
      { status: "error", completedAt: new Date() },
    );

    res.json({
      message: wasStopped ? "Scraper stopped." : "No active scraper found.",
    });
  } catch (err) {
    console.error("[AdminController] killScraper error:", err);
    res.status(500).json({ error: "Failed to stop scraper." });
  }
};
// Toggle a product's Campaign Hero status for the homepage
export const toggleCampaignHero = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the product
    const product = await Product.findOne({ id });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Ensure it actually has a video before allowing it to be a hero
    if (!product.videos || product.videos.length === 0) {
      return res
        .status(400)
        .json({ message: "Product must have a video to be a campaign hero" });
    }

    // Flip the switch
    product.isCampaignHero = !product.isCampaignHero;
    await product.save();

    res.status(200).json({
      message: `Product is now ${product.isCampaignHero ? "live on" : "removed from"} the homepage campaign.`,
      isCampaignHero: product.isCampaignHero,
    });
  } catch (error) {
    console.error("[Admin API] Error toggling campaign hero:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
