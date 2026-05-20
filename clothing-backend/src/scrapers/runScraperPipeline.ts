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
  browser: Browser,
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

  let zaraCookies: any[] = [];

  // 🛡️ THE ARMOR: Sets up viewport, dynamic user agent, and SMART media blocking
  const setupPage = async (p: Page) => {
    await p.setViewport({ width: 1920, height: 1080 });

    const defaultUA = await browser.userAgent();
    const cleanUA = defaultUA.replace(/HeadlessChrome/g, "Chrome");
    await p.setUserAgent(cleanUA);

    await p.setRequestInterception(true);
    p.on("request", (req) => {
      const rt = req.resourceType();
      const url = req.url().toLowerCase();

      // ALWAYS block heavy videos (they are the primary cause of OOM crashes)
      if (rt === "media" || url.endsWith(".mp4") || url.endsWith(".webm")) {
        req.abort();
      }
      // 👇 THE FIX: Let Zara load images naturally so the React grid doesn't collapse!
      else if (rt === "image") {
        if (brandName === "Zara") {
          req.continue(); // Let Zara have its images. safeWipe will handle the RAM.
        } else {
          req.abort(); // Mango and Massimo don't strictly need them
        }
      } else if (brandName !== "Zara" && rt === "font") {
        req.abort();
      } else {
        req.continue();
      }
    });

    return p;
  };

  const safeWipe = async (currentPage: Page) => {
    // Harvest cookies from the dying page BEFORE we kill it
    if (brandName === "Zara" && !currentPage.isClosed()) {
      try {
        const harvested = await currentPage.cookies();
        if (harvested.length > 0) {
          zaraCookies = harvested;
          console.log(
            `   --> 🍪 Harvested ${zaraCookies.length} session cookies.`,
          );
        }
      } catch {}
    }

    try {
      await currentPage.goto("about:blank");
    } catch (e) {}
    if (!currentPage.isClosed()) await currentPage.close().catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    const newPage = await setupPage(await browser.newPage());

    if (brandName === "Zara") {
      // Transplant whatever cookies we have first
      if (zaraCookies.length > 0) {
        try {
          await newPage.setCookie(...zaraCookies);
          console.log(
            `   --> 🍪 Session transplanted (${zaraCookies.length} cookies).`,
          );
        } catch {}
      }

      // 👇 THE FIX: Warm up the TR homepage on every fresh page
      // This sets the geo cookie so category pages don't redirect
      try {
        console.log("   --> 🌍 Warming up Zara TR session...");
        await newPage.goto("https://www.zara.com/tr/en/", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await new Promise((r) => setTimeout(r, 3000));

        // Dismiss modal if it appears
        try {
          const stayBtn = '[data-qa-action="stay-in-store"]';
          await newPage.waitForSelector(stayBtn, { timeout: 3000 });
          await newPage.click(stayBtn);
          await new Promise((r) => setTimeout(r, 1000));
          console.log("   --> ✅ Geo modal dismissed during warmup.");
        } catch {} // No modal = fine

        // Harvest the freshly-set geo cookies
        const freshCookies = await newPage.cookies();
        if (freshCookies.length > 0) {
          zaraCookies = freshCookies;
          console.log(
            `   --> 🍪 Fresh session established (${zaraCookies.length} cookies).`,
          );
        }
      } catch (e: any) {
        console.log(`   --> ⚠️ Warmup failed: ${e.message}`);
      }
    }

    return newPage;
  };

  // Create our initial protected page
  let page = await setupPage(await browser.newPage());

  for (const dept of departments) {
    // 🛡️ WIPE 1: Force a fresh page for every department to survive massive sitemaps
    console.log(`🧹 Wiping browser memory before starting ${dept} pipeline...`);
    page = await safeWipe(page);

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

      // 🛡️ WIPE 2: Wipe memory completely before starting a new category
      console.log(`\n📂 CATEGORY: ${categoryUrl}`);
      console.log("  --> 🧹 Wiping tab memory for new category...");
      page = await safeWipe(page);

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

      // 🛡️ WIPE 3: Clear the heavy grid DOM before scraping individual products
      console.log(
        "  --> 🧹 Wiping bloated grid memory before scraping products...",
      );
      page = await safeWipe(page);

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

        // 🛡️ WIPE 4: The 10-Product Recycle Loop (CRITICAL for Zara)
        if (productCount > 0 && productCount % 10 === 0) {
          console.log("   --> ♻️ Recycling page to free up RAM...");
          page = await safeWipe(page);
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
