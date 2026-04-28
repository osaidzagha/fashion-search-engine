import { Page } from "puppeteer";
import { Product } from "./interface";
import { ProductModel } from "../models/Product";
import { notifyWatchlistUsers } from "../controllers/watchlistController";

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

    // ✅ NEW: The Category Blocklist
    const forbiddenKeywords = [
      "bag",
      "perfume",
      "fragrance",
      "edt",
      "edp",
      "wallet",
      "belt",
      "scarf",
      "sunglasses",
      "beauty",
      "accessories",
    ];

    const cleanCategories = categories.filter((url) => {
      const lowerUrl = url.toLowerCase();
      return !forbiddenKeywords.some((keyword) => lowerUrl.includes(keyword));
    });

    console.log(
      `  --> 🛡️ Filtered out ${categories.length - cleanCategories.length} non-clothing categories.`,
    );

    // Make sure to change `categories` to `cleanCategories` here!
    const shuffledCategories = shuffleArray(cleanCategories);

    // Pick 10 categories
    const toScrape = testMode
      ? shuffledCategories.slice(0, 1)
      : shuffledCategories.slice(0, 10);

    for (const categoryUrl of toScrape) {
      console.log(`\n📂 CATEGORY: ${categoryUrl}`);
      const links = await getLinks(page, categoryUrl);

      if (!links || links.length === 0) {
        console.log(
          `  --> ⚠️ No product links found in ${categoryUrl}. Skipping.`,
        );
        continue;
      }

      const shuffledLinks = shuffleArray(links);
      // Grab up to 60 items per category
      const toTest = testMode
        ? shuffledLinks.slice(0, 2)
        : shuffledLinks.slice(0, 60);

      for (const link of toTest) {
        const category =
          categoryUrl.split("/").pop()?.replace(".html", "") || "Unknown";

        const product = await scrapeProduct(page, link, category, dept);

        if (product) {
          try {
            // Check existing product BEFORE upserting to detect price changes
            const existingProduct = await ProductModel.findOne(
              { id: product.id },
              { price: 1 },
            ).lean();

            const oldPrice = existingProduct?.price ?? null;
            const isNewProduct = oldPrice === null;
            const isPriceDrop = !isNewProduct && product.price < oldPrice!;
            // ✅ FIX: Only record a price history entry when:
            //    - It's a brand new product (first ever entry), OR
            //    - The price actually changed since last scrape
            //    This prevents flat duplicate lines on the chart.
            const shouldRecordPrice =
              isNewProduct || product.price !== oldPrice;

            const updateQuery: any = {
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
              $setOnInsert: {
                timestamp: new Date(),
                brand: product.brand,
                department: product.department,
                category: product.category,
                link: product.link,
                currency: product.currency,
              },
            };

            if (shouldRecordPrice) {
              updateQuery.$push = {
                priceHistory: {
                  $each: [{ price: product.price, date: new Date() }],
                  $slice: -30,
                },
              };
            }

            await ProductModel.findOneAndUpdate(
              { id: product.id },
              updateQuery,
              { upsert: true, returnDocument: "after" },
            );

            console.log(
              `   --> 💾 Saved: ${product.name}${shouldRecordPrice ? " (price recorded)" : " (price unchanged)"}`,
            );
            totalSaved++;

            if (isPriceDrop) {
              console.log(
                `   --> 📉 Price drop: ${oldPrice} → ${product.price} ${product.currency} for "${product.name}"`,
              );
              notifyWatchlistUsers(
                product.id,
                product.name,
                product.link,
                oldPrice!,
                product.price,
                product.currency,
              ).catch((err) =>
                console.error("   --> ⚠️ Watchlist notification failed:", err),
              );
            }
          } catch (dbError) {
            console.error(
              `   --> ❌ DB Error saving ${product.name}:`,
              dbError,
            );
          }
        }

        const delay = testMode ? 1500 : Math.floor(Math.random() * 2000) + 2000;
        await new Promise((r) => setTimeout(r, delay));
      }

      console.log("  --> 🛑 Category complete. Resting...");
      const catDelay = testMode
        ? 4000
        : Math.floor(Math.random() * 5000) + 5000;
      await new Promise((r) => setTimeout(r, catDelay));
    }
  }

  return totalSaved;
};
