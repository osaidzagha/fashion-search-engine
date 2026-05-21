import { Browser, Page } from "puppeteer";
import { Product } from "./interface";
import { ProductModel } from "../models/Product";
import { InterceptPage, asInterceptPage, setMode } from "./pageTypes";

const shuffleArray = (array: any[]) =>
  [...array].sort(() => Math.random() - 0.5);

type GetCategories = (page: InterceptPage, dept: string) => Promise<string[]>;
type GetLinks = (page: InterceptPage, url: string) => Promise<string[]>;
type ScrapeProduct = (
  page: InterceptPage,
  url: string,
  category: string,
  department: string,
) => Promise<Product | null>;

export interface PipelineResult {
  newItems: number;
  updatedItems: number;
  errorCount: number;
}

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

  // ─── setupPage: the ONLY place that calls setRequestInterception ──────────
  const setupPage = async (raw: Page): Promise<InterceptPage> => {
    await raw.setViewport({ width: 1920, height: 1080 });
    await raw.setCacheEnabled(false);
    await raw.setExtraHTTPHeaders({
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    });

    const defaultUA = await browser.userAgent();
    await raw.setUserAgent(defaultUA.replace(/HeadlessChrome/g, "Chrome"));

    const page = asInterceptPage(raw); // brand the page, set default mode

    await page.setRequestInterception(true);

    // Single persistent listener — reads mode flag synchronously, never re-registered
    page.on("request", (req) => {
      if (req.isInterceptResolutionHandled()) return;
      try {
        const type = req.resourceType();
        const allowImage =
          page.__interceptMode === "permissive" && type === "image";
        if (req.isNavigationRequest() || type === "script" || allowImage) {
          req.continue();
        } else {
          req.abort();
        }
      } catch {
        // Stale CDP event after navigation — safe to ignore
      }
    });

    return page;
  };

  // ─── Zara geo warmup ──────────────────────────────────────────────────────
  const zaraGeoWarmup = async (page: InterceptPage): Promise<void> => {
    console.log(
      "   --> 🌍 Running Zara geo-warmup (modal trigger strategy)...",
    );

    try {
      await page.goto("https://www.zara.com/tr/en/", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await new Promise((r) => setTimeout(r, 3000));
    } catch (e: any) {
      console.log(`   --> ⚠️ Homepage warmup failed: ${e.message}`);
    }

    try {
      await page.goto("https://www.zara.com/tr/en/woman-l1066.html", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await new Promise((r) => setTimeout(r, 4000));
    } catch (e: any) {
      console.log(`   --> ⚠️ Warmup category visit failed: ${e.message}`);
    }

    try {
      await page.waitForSelector('[data-qa-action="stay-in-store"]', {
        timeout: 5000,
      });
      await page.click('[data-qa-action="stay-in-store"]');
      await new Promise((r) => setTimeout(r, 2000));
      console.log("   --> ✅ Geo modal dismissed during warmup.");
    } catch {
      console.log(
        "   --> ℹ️ No geo modal during warmup (session already trusted).",
      );

      let isGeoWall = false;
      try {
        isGeoWall = await page.evaluate(() => {
          const text = document.body?.innerText || "";
          return (
            text.includes("SELECT YOUR LOCATION") ||
            document.title === "ZARA Official Website"
          );
        });
      } catch {
        isGeoWall = true;
      }

      if (isGeoWall) {
        console.log("   --> 💉 Geo-wall detected — injecting store cookies...");
        await page.setCookie(
          {
            name: "selectedCountry",
            value: "TR",
            domain: ".zara.com",
            path: "/",
          },
          { name: "store", value: "tr", domain: ".zara.com", path: "/" },
          {
            name: "inditex_country",
            value: "TR",
            domain: ".zara.com",
            path: "/",
          },
        );
        try {
          await page.goto("https://www.zara.com/tr/en/woman-l1066.html", {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          await new Promise((r) => setTimeout(r, 3000));
          await page.waitForSelector('[data-qa-action="stay-in-store"]', {
            timeout: 4000,
          });
          await page.click('[data-qa-action="stay-in-store"]');
          await new Promise((r) => setTimeout(r, 2000));
          console.log("   --> ✅ Geo modal dismissed after cookie injection.");
        } catch {
          console.log(
            "   --> ⚠️ Could not dismiss modal after injection. Proceeding anyway.",
          );
        }
      }
    }

    try {
      const freshCookies = await page.cookies();
      if (freshCookies.length > 0) {
        zaraCookies = freshCookies;
        console.log(
          `   --> 🍪 Warmup complete — ${zaraCookies.length} cookies harvested.`,
        );
      }
    } catch {}
  };

  // ─── safeWipe: close old page, open fresh one ─────────────────────────────
  const safeWipe = async (current: InterceptPage): Promise<InterceptPage> => {
    // 1. Harvest cookies before killing the page
    if (brandName === "Zara" && !current.isClosed()) {
      try {
        const harvested = await current.cookies();
        if (harvested.length > 0) {
          zaraCookies = harvested;
          console.log(
            `   --> 🍪 Harvested ${zaraCookies.length} session cookies.`,
          );
        }
      } catch {}
    }

    // 2. Cleanly disable interception, then close
    try {
      await current.setRequestInterception(false);
    } catch {}
    try {
      await current.goto("about:blank");
    } catch {}
    if (!current.isClosed()) await current.close().catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    // 3. Fresh page — setupPage attaches the one true listener
    const next = await setupPage(await browser.newPage());

    if (brandName === "Zara") {
      if (zaraCookies.length > 0) {
        try {
          await next.setCookie(...zaraCookies);
          console.log(
            `   --> 🍪 Pre-transplanted ${zaraCookies.length} cookies. Skipping geo-warmup.`,
          );
        } catch {}
      } else {
        await zaraGeoWarmup(next);
      }
    }

    return next;
  };

  // ─── Main loop ────────────────────────────────────────────────────────────
  let page = await setupPage(await browser.newPage());

  for (const dept of departments) {
    console.log(`🧹 Wiping browser memory before starting ${dept} pipeline...`);
    page = await safeWipe(page);
    if (page.isClosed()) {
      console.log("🛑 Browser closed. Halting.");
      break;
    }

    console.log(`\n🚀 ${brandName} PIPELINE FOR: ${dept}`);

    let categories: string[] = [];
    try {
      categories = await getCategories(page, dept);
    } catch (err: any) {
      if (
        page.isClosed() ||
        err.message?.includes("detached") ||
        err.message?.includes("Target closed")
      ) {
        console.log("🛑 Browser closed during category fetch. Halting.");
        break;
      }
      console.log(`  --> ❌ Category fetch failed for ${dept}:`, err.message);
      continue;
    }

    if (!categories?.length) {
      console.log(`  --> ⚠️ No categories found for ${dept}. Skipping.`);
      continue;
    }

    console.log(
      `  --> 🛡️ Processing all ${categories.length} discovered links.`,
    );

    const shuffled = shuffleArray(categories);
    const toScrape = testMode ? shuffled.slice(0, 1) : shuffled.slice(0, 7);

    for (const categoryUrl of toScrape) {
      if (page.isClosed()) {
        console.log("🛑 Browser closed.");
        break;
      }

      console.log(`\n📂 CATEGORY: ${categoryUrl}`);
      console.log("  --> 🧹 Wiping tab memory for new category...");
      page = await safeWipe(page);

      let links: string[] = [];
      try {
        links = await getLinks(page, categoryUrl);
      } catch (err: any) {
        if (
          page.isClosed() ||
          err.message?.includes("detached") ||
          err.message?.includes("Target closed")
        ) {
          console.log("🛑 Browser closed during link extraction.");
          break;
        }
        console.log(`  --> ❌ Error finding links:`, err.message);
        continue;
      }

      if (!links?.length) {
        console.log(`  --> ⚠️ No product links found. Skipping.`);
        continue;
      }

      console.log(
        "  --> 🧹 Wiping bloated grid memory before scraping products...",
      );
      page = await safeWipe(page);

      const shuffledLinks = shuffleArray(links);
      const toTest = testMode
        ? shuffledLinks.slice(0, 2)
        : shuffledLinks.slice(0, 50);
      let productCount = 0;

      for (const link of toTest) {
        if (page.isClosed()) {
          console.log("🛑 Browser closed.");
          break;
        }

        if (productCount > 0 && productCount % 10 === 0) {
          console.log("   --> ♻️ Recycling page to free up RAM...");
          page = await safeWipe(page);
        }

        const category =
          categoryUrl.split("/").pop()?.replace(".html", "") || "Unknown";

        try {
          const product = await scrapeProduct(page, link, category, dept);

          if (product) {
            const existing = await ProductModel.findOne(
              { id: product.id },
              { price: 1 },
            ).lean();
            const oldPrice = existing?.price ?? null;
            const isNew = oldPrice === null;
            const priceChanged = isNew || product.price !== oldPrice;

            const updateQuery: any = {
              $set: {
                name: product.name,
                price: product.price,
                department: product.department,
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

            if (priceChanged) {
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
              {
                upsert: true,
                returnDocument: "after",
              },
            );

            isNew ? newItems++ : updatedItems++;
            console.log(
              `   --> 💾 Saved: ${product.name}${priceChanged ? " (price recorded)" : " (price unchanged)"}`,
            );
          }
        } catch (err: any) {
          if (
            page.isClosed() ||
            err.message?.includes("detached") ||
            err.message?.includes("Target closed")
          ) {
            console.log("   --> 🛑 Scraper interrupted. Exiting gracefully.");
            break;
          }
          console.error(`   --> ❌ Scraper crashed on ${link}:`, err.message);
          errorCount++;
        }

        productCount++;
        if (page.isClosed()) break;
        await new Promise((r) =>
          setTimeout(
            r,
            testMode ? 1500 : Math.floor(Math.random() * 3000) + 4000,
          ),
        );
      }

      if (page.isClosed()) break;
      console.log("  --> 🛑 Category complete. Resting...");
      await new Promise((r) =>
        setTimeout(
          r,
          testMode ? 4000 : Math.floor(Math.random() * 5000) + 5000,
        ),
      );
    }
  }

  await page.close().catch(() => {});
  return { newItems, updatedItems, errorCount };
};
