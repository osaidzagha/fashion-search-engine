import { Page } from "puppeteer";
import { Product } from "./interface";
import { ProductModel } from "../models/Product";

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

// ─── Return type ──────────────────────────────────────────────────────────────

export interface PipelineResult {
  newItems: number;
  updatedItems: number;
  errorCount: number;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export const runScraperPipeline = async (
  page: Page,
  brandName: string,
  departments: string[],
  getCategories: GetCategories,
  getLinks: GetLinks,
  scrapeProduct: ScrapeProduct,
  testMode: boolean = true,
): Promise<PipelineResult> => {
  let newItems = 0;
  let updatedItems = 0;
  let errorCount = 0;

  for (const dept of departments) {
    if (page.isClosed()) {
      console.log("🛑 Browser was closed. Halting pipeline gracefully.");
      break;
    }

    console.log(`\n🚀 ${brandName} PIPELINE FOR: ${dept}`);

    let categories: string[] = [];
    try {
      categories = await getCategories(page, dept);
    } catch (err: any) {
      if (
        page.isClosed() ||
        err.message?.includes("detached Frame") ||
        err.message?.includes("Target closed")
      ) {
        console.log(
          "🛑 Browser closed during category fetch. Halting gracefully.",
        );
        break;
      }
      console.log(`  --> ❌ Category fetch failed for ${dept}:`, err.message);
      continue;
    }

    if (!categories || categories.length === 0) {
      console.log(`  --> ⚠️ No categories found for ${dept}. Skipping.`);
      continue;
    }

    const cleanCategories = categories; // No filtering, take everything the crawler finds.

    console.log(
      `  --> 🛡️ Category filter disabled. Processing all ${cleanCategories.length} discovered links.`,
    );

    console.log(
      `  --> 🛡️ Filtered out ${categories.length - cleanCategories.length} non-clothing categories.`,
    );

    const shuffledCategories = shuffleArray(cleanCategories);
    const toScrape = testMode
      ? shuffledCategories.slice(0, 1)
      : shuffledCategories.slice(0, 7);

    for (const categoryUrl of toScrape) {
      if (page.isClosed()) {
        console.log("🛑 Browser was closed. Halting pipeline gracefully.");
        break;
      }

      console.log(`\n📂 CATEGORY: ${categoryUrl}`);

      let links: string[] = [];
      try {
        links = await getLinks(page, categoryUrl);
      } catch (err: any) {
        if (
          page.isClosed() ||
          err.message?.includes("detached Frame") ||
          err.message?.includes("Target closed")
        ) {
          console.log(
            "🛑 Browser closed during link extraction. Halting gracefully.",
          );
          break;
        }
        console.log(`  --> ❌ Error finding links:`, err.message);
        continue;
      }

      if (!links || links.length === 0) {
        console.log(
          `  --> ⚠️ No product links found in ${categoryUrl}. Skipping.`,
        );
        continue;
      }

      const shuffledLinks = shuffleArray(links);
      const toTest = testMode
        ? shuffledLinks.slice(0, 2)
        : shuffledLinks.slice(0, 20);

      for (const link of toTest) {
        if (page.isClosed()) {
          console.log("🛑 Browser was closed. Halting pipeline gracefully.");
          break;
        }

        const category =
          categoryUrl.split("/").pop()?.replace(".html", "") || "Unknown";

        try {
          const product = await scrapeProduct(page, link, category, dept);

          if (product) {
            const existingProduct = await ProductModel.findOne(
              { id: product.id },
              { price: 1 },
            ).lean();

            const oldPrice = existingProduct?.price ?? null;
            const isNewProduct = oldPrice === null;
            const isPriceDrop = !isNewProduct && product.price < oldPrice!;
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
                videos: product.videos,
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

            // ── Track breakdown ──────────────────────────────────────────────
            if (isNewProduct) {
              newItems++;
            } else {
              updatedItems++;
            }

            console.log(
              `   --> 💾 Saved: ${product.name}${shouldRecordPrice ? " (price recorded)" : " (price unchanged)"}`,
            );
          }
        } catch (err: any) {
          // The Magic Check: Intercept shutdown errors and exit silently
          if (
            page.isClosed() ||
            err.message?.includes("detached Frame") ||
            err.message?.includes("Target closed")
          ) {
            console.log(
              `   --> 🛑 Scraper interrupted mid-page load. Exiting gracefully.`,
            );
            break;
          }

          console.error(`   --> ❌ Scraper crashed on ${link}:`, err.message);
          errorCount++;
        }

        if (page.isClosed()) break;
        const delay = testMode ? 1500 : Math.floor(Math.random() * 2000) + 2000;
        await new Promise((r) => setTimeout(r, delay));
      }

      if (page.isClosed()) break;
      console.log("  --> 🛑 Category complete. Resting...");
      const catDelay = testMode
        ? 4000
        : Math.floor(Math.random() * 5000) + 5000;
      await new Promise((r) => setTimeout(r, catDelay));
    }
  }

  return { newItems, updatedItems, errorCount };
};
