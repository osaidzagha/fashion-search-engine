import puppeteer, { Browser } from "puppeteer";
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
  getPullAndBearCategories,
  getPullAndBearProductLinks,
  scrapePullAndBearProductData,
} from "./brands/pullAndBear";
import {
  getMassimoCategories,
  getMassimoProductLinks,
  scrapeMassimoProductData,
} from "./brands/massimoDutti";
import { ScraperRunModel } from "../models/ScraperRun";
// ── CHANGE 1: Import the queue ────────────────────────────────────────────────
import { priceAlertQueue } from "../queues/queues";

// ─── Process Registry ─────────────────────────────────────────────────────────
const activeBrowsers = new Map<string, Browser>();

const BRAND_JOBS: Record<string, any> = {
  zara: {
    brandName: "Zara",
    getCategories: getZaraCategories,
    getLinks: getZaraProductLinks,
    scrapeProduct: scrapeZaraProductData,
  },
  "massimo-dutti": {
    brandName: "Massimo Dutti",
    getCategories: getMassimoCategories,
    getLinks: getMassimoProductLinks,
    scrapeProduct: scrapeMassimoProductData,
  },
  mango: {
    // 👈 The New Mango Pipeline!
    brandName: "Mango",
    getCategories: getMangoCategories,
    getLinks: getMangoProductLinks,
    scrapeProduct: scrapeMangoProductData,
  },
  //"pull-and-bear": {
  //brandName: "Pull & Bear",
  // getCategories: getPullAndBearCategories,
  //   getLinks: getPullAndBearProductLinks,
  // scrapeProduct: scrapePullAndBearProductData,
  //},
};

export const knownBrandSlugs = () => Object.keys(BRAND_JOBS);
export const brandNameForSlug = (slug: string) => BRAND_JOBS[slug]?.brandName;

// ─── The Janitor (Startup Cleanup) ────────────────────────────────────────────
export const cleanupStaleRuns = async (): Promise<void> => {
  console.log("🧹 Cleaning up stale scraper runs...");
  await ScraperRunModel.updateMany(
    { status: "running" },
    { status: "error", completedAt: new Date() },
  );
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
  const startedAt = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
    });

    activeBrowsers.set(brandSlug, browser);

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    const result = await runScraperPipeline(
      page,
      job.brandName,
      ["MAN", "WOMAN"],
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

    console.log(`✅ ${job.brandName} complete.`);
    // ── CHANGE 2: Enqueue price alert check ──
    await priceAlertQueue.add(
      "check-price-drops",
      { brandName: job.brandName, runId: runDocId },
      { delay: 3_000 },
    );
    console.log(`🔔 Price alert job queued for ${job.brandName}.`);
    // ─────────────────────────────────────────────────────────────────────────
  } catch (err) {
    console.error(`❌ ${job.brandName} failed:`, err);
    await ScraperRunModel.findByIdAndUpdate(runDocId, {
      status: "error",
      durationMs: Date.now() - startedAt,
      completedAt: new Date(),
    });
    // Note: we do NOT enqueue a price alert job on scraper failure.
    // Partial/corrupt priceHistory writes should not trigger user emails.
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      activeBrowsers.delete(brandSlug);
    }
  }
};

// Add this to the bottom of src/scrapers/scraperManager.ts

export const runAllScrapers = async (testMode = false): Promise<void> => {
  console.log(
    "🚀 MASTER CRON: Starting all registered scrapers sequentially...",
  );
  const brandSlugs = Object.keys(BRAND_JOBS);

  for (const slug of brandSlugs) {
    const job = BRAND_JOBS[slug];

    // 1. Create the database record for this specific run
    const runDoc = await ScraperRunModel.create({
      brand: job.brandName,
      status: "running",
      startedAt: new Date(),
    });

    console.log(`\n⏳ CRON: Queuing ${job.brandName}...`);

    // 2. Await the scraper so the next one doesn't start until this one finishes
    await triggerScraper(slug, runDoc._id.toString(), testMode);
  }

  console.log("\n✅ MASTER CRON: All scraper jobs have completed.");
};
