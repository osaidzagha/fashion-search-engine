import { Request, Response } from "express";
import { ProductModel } from "../models/Product";
import { UserModel } from "../models/User";
import { ScraperRunModel, IScraperRun } from "../models/ScraperRun";
import {
  triggerScraper,
  knownBrandSlugs,
  brandNameForSlug,
  stopScraper,
} from "../scrapers/scraperService";

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
  $or: [
    { video: { $exists: true, $ne: "" } },
    { videoUrl: { $exists: true } },
    { videos: { $not: { $size: 0 } } },
    { "media.type": "video" },
    { "media.url": /mp4/i },
  ],
};

const ON_SALE_MATCH = { $expr: { $gt: ["$originalPrice", "$price"] } };
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const KNOWN_BRANDS = ["Zara", "Massimo Dutti"] as const;

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
                }, // <-- Fixed ObjectId bug!
                { $sort: { tracks: -1 } },
                { $limit: 5 },
              ],
            },
          },
        ]),

        // C: Scraper runs (Replaces mock data)
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
    const sf = scraperRuns[0];
    const latestByBrand = new Map<string, IScraperRun>(
      (sf.latestPerBrand as any[]).map(({ _id, doc }) => [_id, doc]),
    );

    const scraperStatus = KNOWN_BRANDS.map((brand) => {
      const run = latestByBrand.get(brand);
      if (!run)
        return {
          brand,
          status: "idle" as const,
          lastRun: "Never",
          duration: "—",
          newItems: 0,
          updated: 0,
        };

      return {
        brand,
        status: toFrontendStatus(run.status),
        lastRun: formatLastRun(run.startedAt),
        duration: formatDuration(run.durationMs),
        newItems: run.newItems,
        updated: run.updatedItems,
      };
    });

    const activityLog = (sf.recentRuns as IScraperRun[]).map((run) => ({
      time: formatTime(run.startedAt),
      brand: run.brand,
      event: buildActivityEvent(run),
      detail: buildActivityDetail(run),
      type: buildActivityType(run),
    }));

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
    const brand = req.params.brand as string; // TS FIX

    if (!knownBrandSlugs().includes(brand)) {
      res.status(400).json({ error: `Unknown brand slug: ${brand}` });
      return;
    }

    const brandName = brandNameForSlug(brand);

    const runDoc = await ScraperRunModel.create({
      brand: brandName,
      status: "running",
      startedAt: new Date(),
    });

    triggerScraper(brand, runDoc._id.toString(), false);

    res.status(202).json({
      message: `${brandName} scraper started in the background.`,
      runId: runDoc._id,
    });
  } catch (err) {
    console.error("[AdminController] runScraper error:", err);
    res.status(500).json({ error: "Failed to start scraper." });
  }
};

export const killScraper = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const brand = req.params.brand as string; // TS FIX
    const wasStopped = await stopScraper(brand);

    const brandName = brandNameForSlug(brand) || brand;

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
