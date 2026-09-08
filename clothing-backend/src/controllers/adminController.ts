import { Request, Response } from "express";
import { pool } from "../db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

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

export const getDashboard = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const oneWeekAgo = new Date(Date.now() - ONE_WEEK_MS);
    const [kpiDataRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total_products,
      SUM(CASE WHEN p.created_at >= ? THEN 1 ELSE 0 END) AS new_this_week,
      SUM(CASE WHEN p.original_price > p.product_price THEN 1 ELSE 0 END) AS items_on_sale
      FROM products p 
      WHERE p.available = 1`,
      [oneWeekAgo],
    );
    const totalProducts = Number(kpiDataRows[0]?.total_products || 0);
    const newThisWeek = Number(kpiDataRows[0]?.new_this_week || 0);
    const itemsOnSale = Number(kpiDataRows[0]?.items_on_sale || 0);
    const [totalusersRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total_users FROM users`,
    );
    const totalUsers = Number(totalusersRows[0]?.total_users || 0);
    const [activeVideosRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT product_id) AS active_videos FROM videos`,
    );
    const activeVideos = Number(activeVideosRows[0]?.active_videos || 0);
    const [brandBreakdownRows] = await pool.query<RowDataPacket[]>(
      `SELECT b.brand_name , COUNT(p.product_id) AS count FROM products p JOIN brands b
      ON p.brand_id = b.brand_id 
      WHERE p.available = 1
      GROUP BY b.brand_id
      ORDER BY count DESC`,
    );
    const brandBreakdown = brandBreakdownRows;
    const [activityLogRows] = await pool.query<RowDataPacket[]>(
      `SELECT sr.*, b.brand_name 
      FROM scraper_runs sr 
      JOIN brands b ON
      sr.brand_id = b.brand_id
      ORDER BY sr.started_at DESC
      LIMIT 50`,
    );
    const activityLog = activityLogRows;
    const [videoProductsRows] = await pool.query<RowDataPacket[]>(
      `SELECT p.product_id, p.product_name, b.brand_name, p.is_campaign_hero,
       MIN(i.image_url) AS primary_image,
       MIN(v.video_url) AS primary_video
       FROM products p 
       JOIN brands b ON p.brand_id = b.brand_id
      JOIN videos v ON p.product_id = v.product_id
      LEFT JOIN images i ON p.product_id = i.product_id
      WHERE p.available = 1
      GROUP BY p.product_id
      LIMIT 50`,
    );
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
        label: "Registered Users",
        value: totalUsers.toLocaleString("en-US"),
        delta: "Total accounts",
        up: true,
      },
      {
        label: "Items on Sale",
        value: itemsOnSale.toLocaleString("en-US"),
        delta: `${salePercent}% of catalogue`,
        up: false,
      },
      {
        label: "Active Videos",
        value: activeVideos.toLocaleString("en-US"),
        delta: "Available for campaigns",
        up: true,
      },
    ];

    res.json({
      kpiData,
      priceDropData: [],
      scraperStatus: [],
      brandBreakdown: brandBreakdownRows,
      activityLog: activityLogRows,
      videoProducts: videoProductsRows,
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

    const targetSlug = knownBrandSlugs().find(
      (slug) => slug === input || brandNameForSlug(slug) === input,
    );
    if (!targetSlug) {
      res.status(400).json({ error: `Unknown brand: ${input}` });
      return;
    }
    const brandName = brandNameForSlug(targetSlug);
    const [brandRows] = await pool.query<RowDataPacket[]>(
      `SELECT brand_id FROM brands WHERE brand_name = ?`,
      [brandName],
    );
    const brand = brandRows[0];
    if (!brand) {
      res.status(400).json({ message: "brand not found" });
      return;
    }
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO scraper_runs (brand_id,status,started_at)
      VALUES(?, 'running', NOW())`,
      [brand.brand_id],
    );
    triggerScraper(targetSlug, result.insertId.toString(), false);
    res.status(202).json({
      message: `${brandName} scraper started in the background.`,
      runId: result.insertId,
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
    const targetSlug = knownBrandSlugs().find(
      (slug) => slug === input || brandNameForSlug(slug) === input,
    );
    if (!targetSlug) {
      res.status(400).json({ error: `Unknown brand: ${input}` });
      return;
    }

    const wasStopped = await stopScraper(targetSlug);
    const brandName = brandNameForSlug(targetSlug) || input;
    const [brandRows] = await pool.query<RowDataPacket[]>(
      `SELECT brand_id FROM brands WHERE brand_name = ?`,
      [brandName],
    );
    const brand = brandRows[0];
    if (!brand) {
      res.status(400).json({ message: "brand not found" });
      return;
    }
    const [updateResult] = await pool.query<ResultSetHeader>(
      `UPDATE scraper_runs SET status = 'error', completed_at = NOW()
      WHERE brand_id = ? AND STATUS = 'running'`,
      [brand.brand_id],
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
    const [productRows] = await pool.query<RowDataPacket[]>(
      `SELECT p.product_id, p.is_campaign_hero, COUNT(v.video_id) AS video_count
       FROM products p LEFT JOIN videos v
       ON p.product_id = v.product_id
       WHERE p.product_id = ?
       GROUP BY p.product_id`,
      [id],
    );
    const product = productRows[0];
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const newHeroStatus = product.is_campaign_hero ? 0 : 1;

    if (Number(product.video_count) === 0) {
      return res
        .status(400)
        .json({ message: "Product must have a video to be a campaign hero" });
    }

    const updateHero = await pool.query<ResultSetHeader>(
      "UPDATE products SET is_campaign_hero = ? WHERE product_id = ?",
      [newHeroStatus, id],
    );

    res.status(200).json({
      message: `Product is now ${newHeroStatus ? "live on" : "removed from"} the homepage campaign.`,
      isCampaignHero: Boolean(newHeroStatus),
    });
  } catch (error) {
    console.error("[Admin API] Error toggling campaign hero:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
