import mongoose from "mongoose";
import "dotenv/config";
import { ScraperRunModel } from "../models/ScraperRun";
import { triggerScraper, knownBrandSlugs } from "./scraperManager";

const runFromTerminal = async () => {
  // 1. Connect to the database
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("🔌 Connected to DB for Manual Terminal Run");

  const brands = knownBrandSlugs(); // Grabs ["zara", "massimo-dutti"]

  // 2. Loop through brands and use the NEW engine
  for (const slug of brands) {
    const newRun = await ScraperRunModel.create({
      brand: slug,
      status: "running",
      startedAt: new Date(),
    });

    // NOTE: The 'false' at the end means it will run the FULL scraper, not test mode.
    await triggerScraper(slug, newRun._id.toString(), false);
  }

  console.log("✅ All manual terminal runs complete.");
  process.exit(0);
};

runFromTerminal();
