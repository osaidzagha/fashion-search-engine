import { Browser, Page } from "puppeteer";
import { Product } from "./interface";
import { ProductModel } from "../models/Product";
import { InterceptPage, asInterceptPage } from "./pageTypes";

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

const VOLATILE_KEYWORDS = [
  "new",
  "sale",
  "indirim",
  "best-seller",
  "special",
  "promotions",
  "trend",
];

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

  // ─── 1. RUN MODE ──────────────────────────────────────────────────────────
  const scrapeMode = process.env.SCRAPE_MODE || "full";
  console.log(`\n⚙️ INITIALIZING IN [${scrapeMode.toUpperCase()}] MODE`);

  // ─── 2. DELTA SKIP MEMORY ─────────────────────────────────────────────────
  // FIX #3: Filter by department so mango-man doesn't load WOMAN products into memory
  const staleThresholdDays = 7;
  const staleDate = new Date(Date.now() - staleThresholdDays * 86400000);

  console.log(
    `🧠 Fetching recent links (last ${staleThresholdDays} days) for Delta Skipping...`,
  );
  const existingProducts = await ProductModel.find(
    {
      brand: brandName,
      department: { $in: departments }, // FIX #3: scope to this job's departments only
      updatedAt: { $gt: staleDate },
    },
    { link: 1, sizes: 1, price: 1 },
  ).lean();

  const knownLinksMap = new Map(
    existingProducts.map((p) => [
      p.link ? p.link.split("?")[0].toLowerCase() : "",
      { price: p.price, sizes: (p.sizes as string[]) || [] },
    ]),
  );
  console.log(
    `🧠 Memory loaded: ${knownLinksMap.size} fresh products for ${brandName} [${departments.join(", ")}].`,
  );

  // ─── PAGE SETUP ───────────────────────────────────────────────────────────
  const setupPage = async (raw: Page): Promise<InterceptPage> => {
    await raw.setViewport({ width: 1920, height: 1080 });
    await raw.setCacheEnabled(false);
    await raw.setExtraHTTPHeaders({
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    });

    const defaultUA = await browser.userAgent();
    await raw.setUserAgent(defaultUA.replace(/HeadlessChrome/g, "Chrome"));

    const page = asInterceptPage(raw);
    await page.setRequestInterception(true);

    const requestHandler = (req: any) => {
      if (req.isInterceptResolutionHandled()) return;
      try {
        const type = req.resourceType();
        const allowImage =
          page.__interceptMode === "permissive" && type === "image";

        if (
          req.isNavigationRequest() ||
          type === "script" ||
          type === "fetch" ||
          type === "xhr" ||
          type === "stylesheet" ||
          allowImage
        ) {
          req.continue();
        } else {
          req.abort();
        }
      } catch {
        // Stale CDP event — safe to ignore
      }
    };

    page.on("request", requestHandler);
    (page as any).__removeRequestHandler = () => {
      page.off("request", requestHandler);
    };

    return page;
  };

  // ─── ZARA GEO WARMUP ──────────────────────────────────────────────────────
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
      const safeCookies = freshCookies.filter((c) =>
        [
          "ak_bmsc",
          "bm_sz",
          "bm_sv",
          "bm_mi",
          "_abck",
          "ITXSESSIONID",
          "ITXDEVICEID",
          "UAITXID",
          "rskxRunCookie",
          "lastRskxRun",
          "OptanonConsent",
          "CookiesConsent",
        ].includes(c.name),
      );
      if (safeCookies.length > 0) {
        zaraCookies = safeCookies;
        console.log(
          `   --> 🍪 Warmup complete — ${zaraCookies.length} safe geo-cookies harvested.`,
        );
      }
    } catch {}
  };

  // ─── SAFE WIPE ────────────────────────────────────────────────────────────
  const safeWipe = async (current: InterceptPage): Promise<InterceptPage> => {
    if (brandName === "Zara" && !current.isClosed()) {
      try {
        const harvested = await current.cookies();
        console.log(
          `   --> 🍪 All cookies on page: ${harvested.map((c) => c.name).join(", ")}`,
        );

        const safeCookies = harvested.filter((c) =>
          [
            "ak_bmsc",
            "bm_sz",
            "bm_sv",
            "bm_mi",
            "_abck",
            "ITXSESSIONID",
            "ITXDEVICEID",
            "UAITXID",
            "rskxRunCookie",
            "lastRskxRun",
            "OptanonConsent",
            "CookiesConsent",
          ].includes(c.name),
        );

        if (safeCookies.length > 0) {
          zaraCookies = safeCookies;
          console.log(
            `   --> 🍪 Transplanting ${zaraCookies.length} geo-cookies (destroyed trackers).`,
          );
        }
      } catch {}
    }

    if (!current.isClosed()) {
      try {
        (current as any).__removeRequestHandler?.();
      } catch {}
      try {
        await current.setRequestInterception(false);
      } catch {}
      await current.close().catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 2000));

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

  // ─── SCRAPE WITH SMART RETRY ──────────────────────────────────────────────
  const scrapeWithRetry = async (
    currentPage: InterceptPage,
    link: string,
    category: string,
    dept: string,
    maxRetries = 2,
  ): Promise<{ product: Product | null; page: InterceptPage }> => {
    let page = currentPage;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const product = await scrapeProduct(page, link, category, dept);
        return { product, page };
      } catch (err: any) {
        const isTerminal =
          page.isClosed() ||
          err.message?.includes("detached") ||
          err.message?.includes("Target closed");

        // Terminal errors always bubble up immediately
        if (isTerminal) {
          throw err;
        }

        const isBlock =
          err.message?.includes("BOT_WALL") ||
          err.message?.includes("TIMEOUT") ||
          err.message?.includes("timed out");

        // On final attempt: blocks return null (not a crash), other errors bubble up
        if (attempt === maxRetries) {
          if (isBlock) {
            console.log(
              `   --> 🛡️ Block persisted after ${maxRetries} retries. Moving on.`,
            );
            return { product: null, page };
          }
          throw err;
        }

        // Still have retries left — wipe session and try again
        console.log(
          `   --> 🛡️ ${isBlock ? "Block Detected" : "Error"}. Recycling session & Retrying (${attempt + 1}/${maxRetries}) for ${link.split("?")[0].split("/").pop()}`,
        );
        page = await safeWipe(page);
      }
    }

    return { product: null, page };
  };

  // ─── MAIN LOOP ────────────────────────────────────────────────────────────
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

    // ─── CATEGORY DIET ──────────────────────────────────────────────────────
    let targetCategories = categories;
    if (scrapeMode === "daily" && !testMode) {
      const filtered = categories.filter((cat) =>
        VOLATILE_KEYWORDS.some((k) => cat.toLowerCase().includes(k)),
      );
      targetCategories =
        filtered.length > 0 ? filtered : shuffleArray(categories).slice(0, 20);
      console.log(
        `  --> 🥗 CATEGORY DIET: Reduced from ${categories.length} to ${targetCategories.length} high-value categories.`,
      );
    }

    const shuffled = shuffleArray(targetCategories);
    const toScrape = testMode ? shuffled.slice(0, 1) : shuffled;

    for (const categoryUrl of toScrape) {
      if (page.isClosed()) {
        console.log("🛑 Browser closed.");
        break;
      }

      console.log(`\n📂 CATEGORY: ${categoryUrl}`);
      page = await safeWipe(page);

      // Shared keyword list so category diet and delta skip stay in sync
      const isVolatileCategory = VOLATILE_KEYWORDS.some((k) =>
        categoryUrl.toLowerCase().includes(k),
      );

      // Clean up Zara-style ID suffixes: "tops-l1036" → "tops"
      const rawCat =
        categoryUrl.split("/").pop()?.replace(".html", "") || "Unknown";
      const cleanCategoryName = rawCat
        .replace(/-[lpa0-9]+$/i, "")
        .replace(/-/g, " ");

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

      page = await safeWipe(page);

      const shuffledLinks = shuffleArray(links);
      const toTest = testMode ? shuffledLinks.slice(0, 2) : shuffledLinks;
      let productCount = 0;
      let consecutiveFailures = 0;

      for (const link of toTest) {
        if (page.isClosed()) {
          console.log("🛑 Browser closed.");
          break;
        }
        // If 5 products fail in a row, Akamai has blocked us hard. Bail out.
        if (consecutiveFailures >= 5) {
          console.log(
            `  --> 🛑 CIRCUIT BREAKER TRIGGERED: 5 consecutive failures. IP likely blocked. Skipping rest of category.`,
          );
          break;
        }

        const cleanLink = link.split("?")[0].toLowerCase();

        // ─── DELTA SKIP ───────────────────────────────────────────────────
        if (
          scrapeMode === "daily" &&
          !isVolatileCategory &&
          knownLinksMap.has(cleanLink)
        ) {
          console.log(
            `  --> ⏭️ Delta Skip: Already scraped & fresh -> ${cleanLink.split("/").pop()}`,
          );
          continue;
        }

        if (productCount > 0 && productCount % 10 === 0) {
          console.log("   --> ♻️ Recycling page to free up RAM...");
          page = await safeWipe(page);
        }

        // ─── SCRAPE WITH RETRY ────────────────────────────────────────────
        let product: Product | null = null;
        try {
          const result = await scrapeWithRetry(
            page,
            link,
            cleanCategoryName,
            dept,
          );
          product = result.product;
          page = result.page;
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
          productCount++;
          consecutiveFailures++;
          continue;
        }

        if (product) {
          consecutiveFailures = 0;
          // ─── DATA VALIDATION ──────────────────────────────────────────
          const isValid =
            typeof product.name === "string" &&
            product.name.length > 2 &&
            typeof product.price === "number" &&
            product.price > 0 &&
            Array.isArray(product.images) &&
            product.images.length > 0;

          if (!isValid) {
            console.log(
              `   --> ⚠️ Invalid product data, skipping: ${product.name || link}`,
            );
            errorCount++;
            productCount++;
            continue;
          }

          // ─── FIX #1: Read OLD data BEFORE updating the map ────────────
          const existingData = knownLinksMap.get(cleanLink);
          const oldPrice = existingData?.price ?? null;
          const isNew = oldPrice === null;
          const priceChanged = isNew || product.price !== oldPrice;

          // FIX #2: Sort before comparing to avoid false positives
          const oldSizes = existingData?.sizes ?? [];
          const sizesChanged =
            JSON.stringify([...oldSizes].sort()) !==
            JSON.stringify([...(product.sizes || [])].sort());

          // Update in-memory map AFTER reading old data
          knownLinksMap.set(cleanLink, {
            price: product.price,
            sizes: product.sizes || [],
          });

          // ─── BUILD UPDATE QUERY ───────────────────────────────────────
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
              lastSeenAt: new Date(),
              available: true,
            },
            $setOnInsert: {
              timestamp: new Date(),
              brand: product.brand,
              category: cleanCategoryName,
              link: product.link,
              currency: product.currency,
            },
          };

          const pushes: any = {};
          if (priceChanged) {
            pushes.priceHistory = {
              $each: [{ price: product.price, date: new Date() }],
              $slice: -30,
            };
          }
          if (sizesChanged && !isNew) {
            pushes.stockHistory = {
              $each: [{ sizes: product.sizes, date: new Date() }],
              $slice: -30,
            };
          }
          if (Object.keys(pushes).length > 0) {
            updateQuery.$push = pushes;
          }

          await ProductModel.findOneAndUpdate({ id: product.id }, updateQuery, {
            upsert: true,
          });

          isNew ? newItems++ : updatedItems++;

          const tag = priceChanged
            ? "(💰 Price Update)"
            : sizesChanged
              ? "(📦 Stock Update)"
              : "(✓)";
          console.log(`   --> 💾 Saved: ${product.name} ${tag}`);
        } else {
          consecutiveFailures++;
        }

        productCount++;
        if (page.isClosed()) break;

        // Add significant jitter to evade Akamai rate limits
        let delay = testMode ? 2000 : Math.floor(Math.random() * 3000) + 3000;
        if (brandName === "Zara") {
          delay = testMode ? 4000 : Math.floor(Math.random() * 5000) + 6000; // Wait 6 to 11 seconds for Zara
          console.log(
            `   --> ⏳ Zara Rate Limit Evasion: Waiting ${(delay / 1000).toFixed(1)}s before next product...`,
          );
        }

        await new Promise((r) => setTimeout(r, delay));
      }

      if (page.isClosed()) break;
      console.log("  --> 🛑 Category complete. Resting...");
      await new Promise((r) =>
        setTimeout(
          r,
          testMode ? 4000 : Math.floor(Math.random() * 3000) + 3000,
        ),
      );
    }
  }

  await page.close().catch(() => {});
  return { newItems, updatedItems, errorCount };
};
