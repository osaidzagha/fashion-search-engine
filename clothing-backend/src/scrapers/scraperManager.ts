import puppeteer from "puppeteer";
import * as dotenv from "dotenv";
import mongoose from "mongoose";

// The Pipeline Engine
import { runScraperPipeline } from "./runScraperPipeline";

// Brand Extractors
import {
  getZaraCategories,
  getProductLinksFromCategory as getZaraProductLinks,
  scrapeZaraProductData,
} from "./brands/zara";

import {
  getMassimoCategories,
  getMassimoProductLinks,
  scrapeMassimoProductData,
} from "./brands/massimoDutti";

// 1. THE JOB QUEUE
const SCRAPER_JOBS = [
  {
    brandName: "Massimo Dutti",
    getCategories: getMassimoCategories,
    getLinks: getMassimoProductLinks,
    scrapeProduct: scrapeMassimoProductData,
  },
  {
    brandName: "Zara",
    getCategories: getZaraCategories,
    getLinks: getZaraProductLinks,
    scrapeProduct: scrapeZaraProductData,
  },
];

export const runAllScrapers = async () => {
  dotenv.config();

  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("✅ Connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
    return;
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  );

  const departments = ["MAN", "WOMAN"];
  const isTestMode = false;

  // ── Counters (updated for PipelineResult shape) ───────────────────────────
  let totalNew = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  console.log("🧪 STARTING FACTORY PIPELINE...");

  for (const job of SCRAPER_JOBS) {
    const result = await runScraperPipeline(
      page,
      job.brandName,
      departments,
      job.getCategories,
      job.getLinks,
      job.scrapeProduct,
      isTestMode,
    );
    totalNew += result.newItems;
    totalUpdated += result.updatedItems;
    totalErrors += result.errorCount;
  }

  console.log(
    `\n🎉 PIPELINE COMPLETE! New: ${totalNew} · Updated: ${totalUpdated} · Errors: ${totalErrors}`,
  );

  await browser.close();
  await mongoose.disconnect();
  console.log("💤 Done!");
};

// runAllScrapers();
