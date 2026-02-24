import puppeteer from "puppeteer";
import {
  getZaraCategories,
  getProductLinksFromCategory,
  scrapeProductData,
} from "./scrapers/zara";
import { Product } from "./scrapers/interface";

async function main() {
  console.log("🧪 STARTING FACTORY PIPELINE...");

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
  );

  // THE MASTER DATABASE (Holds everything across all departments)
  const masterDatabase: Product[] = [];

  // 👇 THE GRAND OUTER LOOP (Departments) 👇
  const departmentsToScrape = ["MAN", "WOMAN"]; // Let's test with two departments

  for (const currentDept of departmentsToScrape) {
    console.log(`\n===========================================`);
    console.log(`🚀 LAUNCHING PIPELINE FOR: ${currentDept}`);
    console.log(`===========================================\n`);

    // 1. Get the Map for the CURRENT department
    const categories = await getZaraCategories(page, currentDept); // <-- Notice we pass 'currentDept' now!

    if (categories.length === 0) {
      console.log(
        `❌ Failed to find categories for ${currentDept}. Skipping...`,
      );
      continue; // Skip to the next department instead of crashing
    }

    // 2. THE MIDDLE LOOP (Categories)
    // Let's test with just 1 category per department to keep it fast
    const testCategories = categories.slice(3, 5);

    for (const categoryUrl of testCategories) {
      console.log(`\n📂 ENTERING CATEGORY: ${categoryUrl}`);

      // 3. THE INNER LOOP (Products)
      const productLinks = await getProductLinksFromCategory(page, categoryUrl);
      console.log(
        `   --> Found ${productLinks.length} products. Testing with 2...`,
      );

      const testProductLinks = productLinks.slice(0, 2);

      for (const productLink of testProductLinks) {
        console.log(`   --> Scraping product: ${productLink}`);
        const product = await scrapeProductData(page, productLink);
        if (product) {
          masterDatabase.push(product);
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

  // 4. Print the final haul!
  console.log("\n📦 THE FINAL MASTER DATABASE:");
  console.log(JSON.stringify(masterDatabase, null, 2));
  console.log(
    `\n✅ Successfully scraped ${masterDatabase.length} total items across all departments.`,
  );

  console.log("\n💤 Closing Browser...");
  await browser.close();
}

main();
