import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser } from "puppeteer";

import { runScraperPipeline } from "./runScraperPipeline";
import {
  getZaraCategories,
  getProductLinksFromCategory as getZaraProductLinks,
  scrapeZaraProductData,
} from "./brands/zara";
import {
  getMangoCategories,
  getMangoProductLinks,
  scrapeMangoProductData,
} from "./brands/mango";
import {
  getMassimoCategories,
  getMassimoProductLinks,
  scrapeMassimoProductData,
} from "./brands/massimoDutti";
import { ScraperRunModel } from "../models/ScraperRun";
import { ProductModel } from "../models/Product";
import { priceAlertQueue } from "../queues/queues";

puppeteer.use(StealthPlugin());

// ─── Process Registry ─────────────────────────────────────────────────────────
const activeBrowsers = new Map<string, Browser>();

// ─── Brand Jobs ───────────────────────────────────────────────────────────────
// Each entry is a separate GitHub Actions matrix job.
// Zara, Mango, and Massimo Dutti are all split by department so
// no single job risks hitting the 90-minute timeout.
const BRAND_JOBS: Record<string, any> = {
  "zara-man": {
    brandName: "Zara",
    departments: ["MAN"],
    getCategories: getZaraCategories,
    getLinks: getZaraProductLinks,
    scrapeProduct: scrapeZaraProductData,
  },
  "zara-woman": {
    brandName: "Zara",
    departments: ["WOMAN"],
    getCategories: getZaraCategories,
    getLinks: getZaraProductLinks,
    scrapeProduct: scrapeZaraProductData,
  },
  "mango-man": {
    brandName: "Mango",
    departments: ["MAN"],
    getCategories: getMangoCategories,
    getLinks: getMangoProductLinks,
    scrapeProduct: scrapeMangoProductData,
  },
  "mango-woman": {
    brandName: "Mango",
    departments: ["WOMAN"],
    getCategories: getMangoCategories,
    getLinks: getMangoProductLinks,
    scrapeProduct: scrapeMangoProductData,
  },
  "massimo-dutti-man": {
    brandName: "Massimo Dutti",
    departments: ["MAN"],
    getCategories: getMassimoCategories,
    getLinks: getMassimoProductLinks,
    scrapeProduct: scrapeMassimoProductData,
  },
  "massimo-dutti-woman": {
    brandName: "Massimo Dutti",
    departments: ["WOMAN"],
    getCategories: getMassimoCategories,
    getLinks: getMassimoProductLinks,
    scrapeProduct: scrapeMassimoProductData,
  },
};

export const knownBrandSlugs = () => Object.keys(BRAND_JOBS);
export const brandNameForSlug = (slug: string) => BRAND_JOBS[slug]?.brandName;

// ─── The Janitor (Startup Cleanup) ────────────────────────────────────────────
export const cleanupStaleRuns = async (): Promise<void> => {
  console.log("🧹 Cleaning up stale scraper runs...");

  // Mark any run that was mid-flight when the server restarted
  await ScraperRunModel.updateMany(
    { status: "running" },
    { status: "error", completedAt: new Date() },
  );

  // Mark products not seen in 10 days as unavailable (ghost detection).
  // 10-day threshold gives a 3-day buffer over the 7-day staleness TTL,
  // so a product must be missed on multiple consecutive runs before being ghosted.
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
  const ghostResult = await ProductModel.updateMany(
    { lastSeenAt: { $lt: tenDaysAgo }, available: { $ne: false } },
    { $set: { available: false } },
  );
  if (ghostResult.modifiedCount > 0) {
    console.log(
      `👻 Marked ${ghostResult.modifiedCount} ghost products as unavailable.`,
    );
  }

  await priceAlertQueue.drain();
  await priceAlertQueue.obliterate({ force: true });
  console.log("✅ Queue flushed and stale runs marked as error.");
};

// ─── Stop Engine ──────────────────────────────────────────────────────────────
export const stopScraper = async (brandSlug: string): Promise<boolean> => {
  const browser = activeBrowsers.get(brandSlug);
  if (browser) {
    console.log(`🛑 Stopping ${brandSlug} scraper...`);
    await browser.close().catch(() => {});
    activeBrowsers.delete(brandSlug);
    return true;
  }
  return false;
};

// ─── Trigger Engine ───────────────────────────────────────────────────────────
export const triggerScraper = async (
  brandSlug: string,
  runDocId: string,
  testMode = false,
): Promise<void> => {
  const job = BRAND_JOBS[brandSlug];
  if (!job) {
    throw new Error(`Unknown brand slug: "${brandSlug}"`);
  }

  const startedAt = Date.now();
  let browser: Browser | null = null;

  try {
    browser = (await puppeteer.launch({
      headless: true,
      protocolTimeout: 120000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--disable-blink-features=AutomationControlled",
        "--js-flags=--max-old-space-size=256",
      ],
    })) as unknown as Browser;

    activeBrowsers.set(brandSlug, browser);

    const result = await runScraperPipeline(
      browser,
      job.brandName,
      job.departments,
      job.getCategories,
      job.getLinks,
      job.scrapeProduct,
      testMode,
    );

    const durationMs = Date.now() - startedAt;

    await ScraperRunModel.findByIdAndUpdate(runDocId, {
      status: "success",
      newItems: result.newItems,
      updatedItems: result.updatedItems,
      errorCount: result.errorCount,
      durationMs,
      completedAt: new Date(),
    });

    console.log(
      `✅ ${brandSlug} complete — ${result.newItems} new, ${result.updatedItems} updated, ${result.errorCount} errors.`,
    );

    // Wrap in try/catch so a dead Redis doesn't fail an otherwise successful scrape
    try {
      await priceAlertQueue.add(
        "check-price-drops",
        { brandName: job.brandName, runId: runDocId },
        { delay: 3_000 },
      );
      console.log(`🔔 Price alert job queued for ${job.brandName}.`);
    } catch (redisErr) {
      console.error(
        `⚠️ Failed to queue price alerts (Redis limit likely exceeded):`,
        redisErr,
      );
    }
  } catch (err) {
    console.error(`❌ ${brandSlug} failed:`, err);
    await ScraperRunModel.findByIdAndUpdate(runDocId, {
      status: "error",
      durationMs: Date.now() - startedAt,
      completedAt: new Date(),
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      activeBrowsers.delete(brandSlug);
    }
  }
};
