import { Browser, Page } from "puppeteer";
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
  browser: Browser, // 👈 CHANGED: Now takes the full browser instance
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

  // 🛡️ THE ARMOR: Sets up viewport, user agent, and blocks heavy media
  const setupPage = async (p: Page) => {
    await p.setViewport({ width: 1920, height: 1080 });
    await p.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );
    await p.setRequestInterception(true);
    p.on("request", (req) => {
      const rt = req.resourceType();
      if (rt === "image" || rt === "media" || rt === "font") {
        req.abort();
      } else {
        req.continue();
      }
    });
    return p;
  };

  // Create our initial protected page
  let page = await setupPage(await browser.newPage());

  for (const dept of departments) {
    // 🛡️ THE MEMORY FIX: Force a fresh page for every department to survive massive sitemaps
    console.log(`🧹 Wiping browser memory before starting ${dept} pipeline...`);
    if (!page.isClosed()) await page.close().catch(() => {});
    page = await setupPage(await browser.newPage());

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

    const cleanCategories = categories;

    console.log(
      `  --> 🛡️ Category filter disabled. Processing all ${cleanCategories.length} discovered links.`,
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

      // 👇 ADD THIS: Wipe memory completely before starting a new category
      console.log(`\n📂 CATEGORY: ${categoryUrl}`);
      console.log("  --> 🧹 Wiping tab memory for new category...");
      if (!page.isClosed()) await page.close().catch(() => {});
      page = await setupPage(await browser.newPage());

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
        : shuffledLinks.slice(0, 50);

      let productCount = 0; // Track products for recycling

      for (const link of toTest) {
        if (page.isClosed()) {
          console.log("🛑 Browser was closed. Halting pipeline gracefully.");
          break;
        }

        if (productCount > 0 && productCount % 10 === 0) {
          console.log("   --> ♻️ Recycling page to free up RAM...");
          await page.close().catch(() => {});
          page = await setupPage(await browser.newPage());
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
                department: product.department, // ✅ KEEP IT HERE
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
                // ❌ REMOVE DEPARTMENT FROM HERE
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

        productCount++;

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

  // Cleanup our page when the whole pipeline is done
  await page.close().catch(() => {});
  return { newItems, updatedItems, errorCount };
};
