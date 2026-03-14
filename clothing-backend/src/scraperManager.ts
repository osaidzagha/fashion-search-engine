import puppeteer from "puppeteer";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { ProductModel } from "./models/Product";
import {
  getZaraCategories,
  getProductLinksFromCategory,
  scrapeProductData,
} from "./scrapers/zara";

export const runAllScrapers = async () => {
  console.log("Foreman: Starting all scraping jobs...");
  dotenv.config();

  console.log("🧪 STARTING FACTORY PIPELINE...");

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
  );

  let totalSaved = 0;
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
            await ProductModel.findOneAndUpdate({ id: product.id }, product, {
              upsert: true,
              returnDocument: "after",
            });
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
};
