import puppeteer from "puppeteer";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { ProductModel } from "./models/Product";
import {
  getZaraCategories,
  getProductLinksFromCategory,
  scrapeProductData,
} from "./scrapers/zara";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI as string;
async function main() {
  console.log("🧪 STARTING FACTORY PIPELINE...");

  // 🔌 1. Connect to MongoDB First
  console.log("🔌 Connecting to MongoDB...");
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Database Connected!");
  } catch (error) {
    console.log("❌ Failed to connect to MongoDB.");
    console.error(error);
    return; // Stop the script if the database isn't running
  }

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
  );

  let totalSaved = 0; // Keep a tally of successful saves
  const departmentsToScrape = ["MAN", "WOMAN"];

  for (const currentDept of departmentsToScrape) {
    console.log(`\n===========================================`);
    console.log(`🚀 LAUNCHING PIPELINE FOR: ${currentDept}`);
    console.log(`===========================================\n`);

    const categories = await getZaraCategories(page, currentDept);
    if (categories.length === 0) {
      console.log(
        `❌ Failed to find categories for ${currentDept}. Skipping...`,
      );
      continue;
    }

    const testCategories = categories.slice(3, 5);

    for (const categoryUrl of testCategories) {
      console.log(`\n📂 ENTERING CATEGORY: ${categoryUrl}`);

      const productLinks = await getProductLinksFromCategory(page, categoryUrl);
      console.log(
        `   --> Found ${productLinks.length} products. Testing with 2...`,
      );

      const testProductLinks = productLinks.slice(0, 2);

      for (const productLink of testProductLinks) {
        console.log(`   --> Scraping product: ${productLink}`);
        const product = await scrapeProductData(page, productLink);

        if (product) {
          // 💾 2. THE UPSERT OPERATION
          try {
            await ProductModel.findOneAndUpdate(
              { link: product.link }, // Search by unique URL
              product, // The extracted data to save
              { upsert: true, returnDocument: "after" }, // Update if exists, Insert if new
            );
            console.log(`   --> 💾 Saved to MongoDB: ${product.name}`);
            totalSaved++;
          } catch (dbError) {
            console.log(`   --> ❌ Database Error saving ${product.name}`);
            console.error(dbError);
          }
        }
        await new Promise((r) => setTimeout(r, 1500));
      }

      console.log("   --> 🛑 Category complete. Resting for 4 seconds...");
      await new Promise((r) => setTimeout(r, 4000));
    }

    console.log(
      `\n✅ Finished ${currentDept} department. Resting for 5 seconds before switching...`,
    );
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log(
    `\n🎉 PIPELINE COMPLETE! Total items saved/updated in database: ${totalSaved}`,
  );

  // 🔌 3. Disconnect Cleanly
  console.log("💤 Closing Connections...");
  await browser.close();
  await mongoose.disconnect();
}

main();
