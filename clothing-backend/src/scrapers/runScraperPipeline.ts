import { Page } from "puppeteer";
import { Product } from "./interface"; // Ensure this path is correct
import { ProductModel } from "../models/Product"; // Ensure this path is correct

type GetCategories = (page: Page, dept: string) => Promise<string[]>;
type GetLinks = (page: Page, url: string) => Promise<string[]>;
type ScrapeProduct = (
  page: Page,
  url: string,
  category: string,
  categoryUrl?: string,
) => Promise<Product | null>;

export const runScraperPipeline = async (
  page: Page,
  brandName: string,
  departments: string[],
  getCategories: GetCategories,
  getLinks: GetLinks,
  scrapeProduct: ScrapeProduct,
  testMode: boolean = true,
) => {
  let totalSaved = 0;

  for (const dept of departments) {
    console.log(`\n🚀 ${brandName} PIPELINE FOR: ${dept}`);

    const categories = await getCategories(page, dept);
    if (!categories || categories.length === 0) {
      console.log(`  --> ⚠️ No categories found for ${dept}. Skipping.`);
      continue;
    }

    const toScrape = testMode ? categories.slice(0, 2) : categories.slice(0, 5);

    for (const categoryUrl of toScrape) {
      console.log(`\n📂 CATEGORY: ${categoryUrl}`);
      const links = await getLinks(page, categoryUrl);

      if (!links || links.length === 0) {
        console.log(
          `  --> ⚠️ No product links found in ${categoryUrl}. Skipping.`,
        );
        continue;
      }

      const toTest = testMode ? links.slice(0, 2) : links.slice(0, 15);

      for (const link of toTest) {
        // Safe category extraction (handles URLs with or without .html)
        const category =
          categoryUrl.split("/").pop()?.replace(".html", "") || "Unknown";

        const product = await scrapeProduct(page, link, category, categoryUrl);

        if (product) {
          try {
            await ProductModel.findOneAndUpdate({ id: product.id }, product, {
              upsert: true,
              returnDocument: "after",
            });
            console.log(`   --> 💾 Saved: ${product.name}`);
            totalSaved++;
          } catch (dbError) {
            console.error(
              `   --> ❌ DB Error saving ${product.name}:`,
              dbError,
            );
          }
        }

        // Politeness Delay: Always pause between products to avoid bans
        const delay = testMode ? 1500 : Math.floor(Math.random() * 2000) + 2000; // 2-4 seconds in prod
        await new Promise((r) => setTimeout(r, delay));
      }

      console.log("   --> 🛑 Category complete. Resting...");
      // Longer pause between categories
      const catDelay = testMode
        ? 4000
        : Math.floor(Math.random() * 5000) + 5000;
      await new Promise((r) => setTimeout(r, catDelay));
    }
  }
  return totalSaved;
};
