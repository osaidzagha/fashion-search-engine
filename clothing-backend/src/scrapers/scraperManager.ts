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
// Adding a new brand is now as simple as adding one object to this array.
const SCRAPER_JOBS = [
  {
    brandName: "Zara",
    getCategories: getZaraCategories,
    getLinks: getZaraProductLinks,
    scrapeProduct: scrapeZaraProductData,
  },
  {
    brandName: "Massimo Dutti",
    getCategories: getMassimoCategories,
    getLinks: getMassimoProductLinks,
    scrapeProduct: scrapeMassimoProductData,
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

  const departments = ["MAN", "WOMAN", "KIDS"];
  const isTestMode = true; // Set to false when ready for a full production run
  let totalSaved = 0;

  console.log("🧪 STARTING FACTORY PIPELINE...");

  // 2. THE ORCHESTRATOR
  // It doesn't care what brand it is, it just runs the jobs it's given.
  for (const job of SCRAPER_JOBS) {
    const savedCount = await runScraperPipeline(
      page,
      job.brandName,
      departments,
      job.getCategories,
      job.getLinks,
      job.scrapeProduct,
      isTestMode,
    );
    totalSaved += savedCount;
  }

  console.log(
    `\n🎉 PIPELINE COMPLETE! Total items saved/updated: ${totalSaved}`,
  );

  await browser.close();
  await mongoose.disconnect();
  console.log("💤 Done!");
};

// runAllScrapers();
