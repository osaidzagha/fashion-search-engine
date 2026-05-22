import mongoose from "mongoose";
import "dotenv/config";
import { ScraperRunModel } from "../models/ScraperRun";
import { triggerScraper, knownBrandSlugs } from "./scraperManager";

const runFromTerminal = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("🔌 Connected to DB for Manual Terminal Run");

  // 1. Check if a specific brand was passed via terminal (e.g., node runNow.js zara)
  const targetBrand = process.argv[2];

  // 2. If a brand was passed, only run that one. Otherwise, run all.
  const brands = targetBrand ? [targetBrand] : knownBrandSlugs();

  for (const slug of brands) {
    if (!knownBrandSlugs().includes(slug)) {
      console.warn(`⚠️ Unknown brand: ${slug}`);
      continue;
    }

    const newRun = await ScraperRunModel.create({
      brand: slug,
      status: "running",
      startedAt: new Date(),
    });

    await triggerScraper(slug, newRun._id.toString(), false);
  }

  console.log("✅ Manual terminal run complete.");
  process.exit(0);
};

runFromTerminal();
