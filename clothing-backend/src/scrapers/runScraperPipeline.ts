import { Page } from "puppeteer";
import { Product } from "./interface"; // Ensure this path is correct
import { ProductModel } from "../models/Product"; // Ensure this path is correct

const shuffleArray = (array: any[]) => {
  return [...array].sort(() => Math.random() - 0.5);
};

type GetCategories = (page: Page, dept: string) => Promise<string[]>;
type GetLinks = (page: Page, url: string) => Promise<string[]>;
type ScrapeProduct = (
  page: Page,
  url: string,
  category: string,
  department: string,
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

    // 1. Shuffle the categories, then grab a few
    const shuffledCategories = shuffleArray(categories);
    const toScrape = testMode
      ? shuffledCategories.slice(0, 1)
      : shuffledCategories.slice(0, 3);
    for (const categoryUrl of toScrape) {
      console.log(`\n📂 CATEGORY: ${categoryUrl}`);
      const links = await getLinks(page, categoryUrl);

      if (!links || links.length === 0) {
        console.log(
          `  --> ⚠️ No product links found in ${categoryUrl}. Skipping.`,
        );
        continue;
      }

      // 2. Shuffle the product links, then grab a subset
      const shuffledLinks = shuffleArray(links);
      const toTest = testMode
        ? shuffledLinks.slice(0, 2)
        : shuffledLinks.slice(0, 15);
      for (const link of toTest) {
        // Safe category extraction (handles URLs with or without .html)
        const category =
          categoryUrl.split("/").pop()?.replace(".html", "") || "Unknown";

        const product = await scrapeProduct(page, link, category, dept);

        if (product) {
          try {
            await ProductModel.findOneAndUpdate(
              { id: product.id },
              {
                // 👇 FIX: Explicitly tell Mongo to overwrite ALL dynamic fields on every run
                $set: {
                  name: product.name,
                  price: product.price,
                  originalPrice: product.originalPrice,
                  color: product.color,
                  description: product.description,
                  composition: product.composition,
                  images: product.images,
                  sizes: product.sizes,
                  video: product.video,
                },
                // 2. ONLY set these structural fields if the product is brand new
                $setOnInsert: {
                  timestamp: new Date(),
                  brand: product.brand,
                  department: product.department,
                  category: product.category,
                  link: product.link,
                  currency: product.currency,
                },
                // 3. Keep tracking price history
                $push: {
                  priceHistory: {
                    $each: [{ price: product.price, date: new Date() }],
                    $slice: -30,
                  },
                },
              },
              {
                upsert: true,
                returnDocument: "after",
              },
            );
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

      console.log("  --> 🛑 Category complete. Resting...");
      // Longer pause between categories
      const catDelay = testMode
        ? 4000
        : Math.floor(Math.random() * 5000) + 5000;
      await new Promise((r) => setTimeout(r, catDelay));
    }
  }
  return totalSaved;
};
