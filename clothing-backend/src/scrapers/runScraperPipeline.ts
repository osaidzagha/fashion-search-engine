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

  // ─── setupPage owns interception for the page's entire lifetime ───────────
  // No other function should call setRequestInterception or removeAllListeners.
  const setupPage = async (p: Page) => {
    await p.setViewport({ width: 1920, height: 1080 });
    await p.setCacheEnabled(false);
    await p.setExtraHTTPHeaders({
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    });

    const defaultUA = await browser.userAgent();
    const cleanUA = defaultUA.replace(/HeadlessChrome/g, "Chrome");
    await p.setUserAgent(cleanUA);

    // ✅ Enable interception BEFORE attaching the listener
    await p.setRequestInterception(true);

    p.on("request", (req) => {
      // ✅ Guard: skip if already handled (prevents "not enabled" crash on
      //    stale CDP events after navigation or context switch)
      if (req.isInterceptResolutionHandled()) return;

      try {
        const type = req.resourceType();

        // Allow images when the scraper signals it needs them (lazy-load phase)
        // The flag is written to window.__allowImages by scrapeZaraProductData
        // via page.evaluate — we read it synchronously here from the frame.
        let allowImages = false;
        try {
          // mainFrame().evaluate is synchronous-enough for this guard
          // If it throws (detached frame) we just default to false
          allowImages =
            (req.frame()?.url() !== "about:blank" &&
              // @ts-ignore – accessing internal frame world for flag
              req.frame()?._mainWorld?._document) != null
              ? false
              : false;
        } catch {
          allowImages = false;
        }

        if (
          req.isNavigationRequest() ||
          type === "script" ||
          (allowImages && type === "image")
        ) {
          req.continue();
        } else {
          req.abort();
        }
      } catch {
        // CDP interception state desynced on navigation — safe to ignore
      }
    });

    return p;
  };

  // ─── Helper: enable image loading for the lazy-scroll phase ─────────────
  // Sets a flag on window so the request interceptor can check it.
  // Must be awaited before the scroll, and cleared after image collection.
  const setImageMode = async (p: Page, allow: boolean) => {
    // We don't use window.__allowImages via the interceptor (async read is
    // unreliable there). Instead we temporarily swap the listener.
    try {
      p.removeAllListeners("request");

      if (allow) {
        // Permissive listener: let images through
        p.on("request", (req) => {
          if (req.isInterceptResolutionHandled()) return;
          try {
            const type = req.resourceType();
            if (
              req.isNavigationRequest() ||
              type === "script" ||
              type === "image"
            ) {
              req.continue();
            } else {
              req.abort();
            }
          } catch {}
        });
      } else {
        // Restore the default restrictive listener
        p.on("request", (req) => {
          if (req.isInterceptResolutionHandled()) return;
          try {
            const type = req.resourceType();
            if (req.isNavigationRequest() || type === "script") {
              req.continue();
            } else {
              req.abort();
            }
          } catch {}
        });
      }
    } catch {}
  };

  // ─── Zara geo warmup ──────────────────────────────────────────────────────
  const zaraGeoWarmup = async (p: Page): Promise<void> => {
    console.log(
      "   --> 🌍 Running Zara geo-warmup (modal trigger strategy)...",
    );

    // Step 1: Homepage first to get base cookies
    try {
      await p.goto("https://www.zara.com/tr/en/", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await new Promise((r) => setTimeout(r, 3000));
    } catch (e: any) {
      console.log(`   --> ⚠️ Homepage warmup failed: ${e.message}`);
    }

    // Step 2: Poke a known category URL — triggers the modal
    try {
      await p.goto("https://www.zara.com/tr/en/woman-l1066.html", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await new Promise((r) => setTimeout(r, 4000));
    } catch (e: any) {
      console.log(`   --> ⚠️ Warmup category visit failed: ${e.message}`);
    }

    // Step 3: Dismiss the modal if it appeared
    try {
      await p.waitForSelector('[data-qa-action="stay-in-store"]', {
        timeout: 5000,
      });
      await p.click('[data-qa-action="stay-in-store"]');
      await new Promise((r) => setTimeout(r, 2000));
      console.log("   --> ✅ Geo modal dismissed during warmup.");
    } catch {
      console.log(
        "   --> ℹ️ No geo modal during warmup (session already trusted).",
      );

      let isGeoWall = false;
      try {
        isGeoWall = await p.evaluate(() => {
          const text = document.body?.innerText || "";
          return (
            text.includes("SELECT YOUR LOCATION") ||
            document.title === "ZARA Official Website"
          );
        });
      } catch (err) {
        console.log(
          "   --> ⚠️ Browser navigating during geo-check. Assuming geo-wall...",
        );
        isGeoWall = true;
      }

      if (isGeoWall) {
        console.log(
          "   --> 💉 Geo-wall detected in warmup — injecting store cookies...",
        );
        await p.setCookie(
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
          await p.goto("https://www.zara.com/tr/en/woman-l1066.html", {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          await new Promise((r) => setTimeout(r, 3000));
          await p.waitForSelector('[data-qa-action="stay-in-store"]', {
            timeout: 4000,
          });
          await p.click('[data-qa-action="stay-in-store"]');
          await new Promise((r) => setTimeout(r, 2000));
          console.log("   --> ✅ Geo modal dismissed after cookie injection.");
        } catch {
          console.log(
            "   --> ⚠️ Could not dismiss modal after injection. Proceeding anyway.",
          );
        }
      }
    }

    // Step 4: Harvest the full post-modal cookie set
    try {
      const freshCookies = await p.cookies();
      if (freshCookies.length > 0) {
        zaraCookies = freshCookies;
        console.log(
          `   --> 🍪 Warmup complete — ${zaraCookies.length} cookies harvested.`,
        );
      }
    } catch {}
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

    // ✅ Remove all listeners before navigating away to prevent stale CDP
    //    events from firing on the dying page
    try {
      currentPage.removeAllListeners("request");
    } catch {}

    // ✅ Disable interception before closing so Puppeteer doesn't fire
    //    pending intercepted requests into the void
    try {
      await currentPage.setRequestInterception(false);
    } catch {}

    try {
      await currentPage.goto("about:blank");
    } catch {}

    if (!currentPage.isClosed()) await currentPage.close().catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    // ✅ Fresh page — setupPage enables interception and attaches the listener
    const newPage = await setupPage(await browser.newPage());

    if (brandName === "Zara") {
      if (zaraCookies.length > 0) {
        try {
          await newPage.setCookie(...zaraCookies);
          console.log(
            `   --> 🍪 Pre-transplanted ${zaraCookies.length} cookies. Skipping geo-warmup.`,
          );
        } catch {}
      } else {
        await zaraGeoWarmup(newPage);
      }
    }

    return newPage;
  };

  // Expose setImageMode so scrapers can call it (passed via closure on page)
  // We attach it to the pipeline context; zara.ts imports it separately.
  // Here we attach it to the page object as a non-enumerable property so
  // scrapeZaraProductData can reach it without a circular import.
  const wrapPageWithImageMode = (p: Page) => {
    Object.defineProperty(p, "__setImageMode", {
      value: (allow: boolean) => setImageMode(p, allow),
      writable: true,
      configurable: true,
    });
    return p;
  };

  // Create our initial protected page
  let page = wrapPageWithImageMode(await setupPage(await browser.newPage()));

  for (const dept of departments) {
    console.log(`🧹 Wiping browser memory before starting ${dept} pipeline...`);
    page = wrapPageWithImageMode(await safeWipe(page));

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

      console.log(`\n📂 CATEGORY: ${categoryUrl}`);
      console.log("  --> 🧹 Wiping tab memory for new category...");
      page = wrapPageWithImageMode(await safeWipe(page));

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

      console.log(
        "  --> 🧹 Wiping bloated grid memory before scraping products...",
      );
      page = wrapPageWithImageMode(await safeWipe(page));

      const shuffledLinks = shuffleArray(links);
      const toTest = testMode
        ? shuffledLinks.slice(0, 2)
        : shuffledLinks.slice(0, 50);

      let productCount = 0;

      for (const link of toTest) {
        if (page.isClosed()) {
          console.log("🛑 Browser was closed. Halting pipeline gracefully.");
          break;
        }

        if (productCount > 0 && productCount % 10 === 0) {
          console.log("   --> ♻️ Recycling page to free up RAM...");
          page = wrapPageWithImageMode(await safeWipe(page));
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
            const shouldRecordPrice =
              isNewProduct || product.price !== oldPrice;

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
        const delay = testMode ? 1500 : Math.floor(Math.random() * 3000) + 4000;
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

  await page.close().catch(() => {});
  return { newItems, updatedItems, errorCount };
};
