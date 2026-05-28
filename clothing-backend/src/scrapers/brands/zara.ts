import { Product } from "../interface";
import { InterceptPage, setMode } from "../pageTypes";

import https from "https";
import * as cheerio from "cheerio";

// ─── HTTP fetch (Node.js side, immune to browser context destruction) ─────────
function fetchUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/xml, application/xml, */*",
        },
        timeout: 15000,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchUrl(res.headers.location).then(resolve);
          return;
        }
        if (!res.statusCode || res.statusCode !== 200) {
          resolve(null);
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

function extractZaraCategoryLinks(xmlText: string, dept: string): string[] {
  const locMatches = xmlText.match(/<loc>(.*?)<\/loc>/g) || [];
  const locs = locMatches.map((m) => m.replace(/<\/?loc>/g, "").trim());
  return [
    ...new Set(
      locs.filter(
        (href) =>
          href.includes(`/${dept}-`) &&
          !href.includes("-p") &&
          href.includes("zara.com/tr/en/"),
      ),
    ),
  ];
}

export function parseUniversalPrice(rawPrice: string): number | undefined {
  if (!rawPrice) return undefined;
  let cleanStr = rawPrice.replace(/[^\d.,]/g, "");
  if (!cleanStr) return undefined;

  const lastComma = cleanStr.lastIndexOf(",");
  const lastDot = cleanStr.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      cleanStr = cleanStr.replace(/\./g, "").replace(",", ".");
    } else {
      cleanStr = cleanStr.replace(/,/g, "");
    }
  } else if (lastDot > -1 && lastComma === -1) {
    if (cleanStr.length - lastDot === 4) cleanStr = cleanStr.replace(/\./g, "");
  } else if (lastComma > -1 && lastDot === -1) {
    cleanStr = cleanStr.replace(",", ".");
  }

  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? undefined : parsed;
}

async function handleGeoModal(page: InterceptPage) {
  console.log("   --> Checking for Geo-Location Modal...");
  try {
    await page.waitForSelector('[data-qa-action="stay-in-store"]', {
      timeout: 3000,
    });
    console.log("   --> Modal Detected! Clicking 'Stay in Turkey'...");
    await page.click('[data-qa-action="stay-in-store"]');
    await new Promise((r) => setTimeout(r, 1000));
    console.log("   --> Modal Dismissed.");
  } catch {
    console.log("   --> No modal found (Safe to proceed).");
  }
}

// ─── Product scraper ──────────────────────────────────────────────────────────
export async function scrapeZaraProductData(
  page: InterceptPage,
  url: string,
  category: string = "",
  department: string = "",
): Promise<Product | null> {
  setMode(page, "restrictive"); // always start restrictive

  try {
    const match = url.match(/-p([a-zA-Z0-9]+)\.html/);
    if (!match) {
      console.log(`  --> ⚠️ No ID found in URL, skipping: ${url}`);
      return null;
    }
    const productId = match[1];

    // ─── Page load — timeout is treated as a bot wall ─────────────────────
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    } catch {
      console.log("  --> 🚫 Bot wall detected. Bailing immediately.");
      throw new Error("BOT_WALL_DETECTED");
    }

    // ─── H1 check — missing H1 after load = blocked session ──────────────
    try {
      await page.waitForSelector("h1", { timeout: 10000 });
    } catch {
      const isBlocked = await page
        .evaluate(() => {
          const body = document.body?.innerText || "";
          return (
            body.includes("Access Denied") ||
            body.includes("Pardon Our Interruption") ||
            document.title === "Access Denied" ||
            document.querySelectorAll(".product-detail-info").length === 0
          );
        })
        .catch(() => true);

      if (isBlocked) {
        console.log("  --> 🚫 Bot wall detected. Bailing immediately.");
        throw new Error("BOT_WALL_DETECTED");
      } else {
        console.log(`  --> ❌ Page blank or H1 missing. Skipping.`);
        setMode(page, "restrictive");
        return null;
      }
    }

    // ─── STEP 1: Wait for JS hydration ───────────────────────────────────────
    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var maxWait = 10000, waited = 0;
          var interval = setInterval(function() {
            var descEl  = document.querySelector('.product-detail-description');
            var colorEl = document.querySelector('.product-color-extended-name');
            var priceEl = document.querySelector('.money-amount__main, .price__amount');
            var descReady  = descEl  && descEl.textContent  && descEl.textContent.trim().length  > 0;
            var colorReady = colorEl && colorEl.textContent && colorEl.textContent.trim().length > 0;
            var priceReady = priceEl && /[0-9]/.test(priceEl.textContent);
            waited += 100;
            if ((descReady && colorReady && priceReady) || waited >= maxWait) {
              clearInterval(interval); resolve(undefined);
            }
          }, 100);
        });
      })()
    `);

    // ─── STEP 2: Read all text data ───────────────────────────────────────────
    const textData = (await page.evaluate(`
      (function() {
        function getText(selector) {
          var el = document.querySelector(selector);
          return el && el.textContent ? el.textContent.replace(/\\s+/g, ' ').trim() : '';
        }
        var name = 
  getText('h1.product-detail-info__header-name') || 
  getText('h1.product-detail-info__name') || 
  (function() {
    var h1s = Array.from(document.querySelectorAll('h1'));
    for (var i=0; i<h1s.length; i++) {
      var text = h1s[i].textContent || '';
      // Ignore generic modal greetings
      if (text && text.trim().length > 2 && !text.toLowerCase().includes('hello') && !text.toLowerCase().includes('welcome')) {
        return text.replace(/\\s+/g, ' ').trim();
      }
    }
    return '';
  })();
        var description = getText('.product-detail-description') || getText('[class*="product-detail-info__description"]');
        var color       = getText('.product-color-extended-name') || getText('[class*="color-extended"]');
        var compItems   = Array.from(document.querySelectorAll('.product-detail-composition__item.product-detail-composition__part'));
        var composition = compItems.length > 0
          ? compItems.map(function(el) { return el.textContent ? el.textContent.replace(/\\s+/g, ' ').trim() : ''; }).filter(Boolean).join(', ')
          : getText('.product-detail-composition.product-detail-view__detailed-composition') || getText('.product-detail-composition');

        function getText2(selector) {
          var el = document.querySelector(selector);
          return el && el.textContent ? el.textContent.trim() : '';
        }
        var originalRaw =
          getText2('[data-qa-qualifier="price-amount-old"] .money-amount__main') ||
          getText2('[data-qa-qualifier="price-amount-old"]') ||
          getText2('.price-old__amount .money-amount__main') ||
          getText2('.price__amount--old-price-wrapper .money-amount__main');
        var currentRaw =
          getText2('.price-current__amount .money-amount__main') ||
          getText2('.price-current .money-amount__main') ||
          getText2('.price__amount--on-sale .money-amount__main');
        if (!originalRaw || !currentRaw) {
          var allPrices = Array.from(document.querySelectorAll('.product-detail-info__price .money-amount__main'))
            .map(function(el) { return el.textContent ? el.textContent.trim() : ''; }).filter(Boolean);
          if (allPrices.length >= 2) { originalRaw = originalRaw || allPrices[0]; currentRaw = currentRaw || allPrices[allPrices.length - 1]; }
          else if (allPrices.length === 1) { currentRaw = currentRaw || allPrices[0]; }
        }
        return { name, description, color, composition, currentRaw, originalRaw };
      })()
    `)) as {
      name: string;
      description: string;
      color: string;
      composition: string;
      currentRaw: string;
      originalRaw: string;
    };

    // ─── STEP 3: Switch to permissive, scroll for lazy images ─────────────────
    setMode(page, "permissive");

    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var totalHeight = 0, distance = 300;
          var timer = setInterval(function() {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= document.body.scrollHeight - window.innerHeight || totalHeight > 8000) {
              clearInterval(timer); resolve(undefined);
            }
          }, 300);
        });
      })()
    `);
    await new Promise((r) => setTimeout(r, 2000));

    // ─── STEP 4: Read images ──────────────────────────────────────────────────
    const rawImages = (await page.evaluate(`
      (function() {
        function sanitizeAndUpscale(url) {
          if (!url) return null;
          var lowerUrl = url.toLowerCase();
          if (lowerUrl.startsWith('data:') || lowerUrl.endsWith('.svg') || lowerUrl.includes('placeholder')) return null;
          if (lowerUrl.includes('swatch') || lowerUrl.includes('texture') || lowerUrl.includes('color-selector')) return null;
          return url.replace(/\\/w\\/\\d+\\//g, '/w/1024/');
        }
        function pickHighestResFromSources(sources) {
          var bestUrl = null, bestWidth = -1;
          sources.forEach(function(source) {
            var srcset = source.getAttribute('srcset') || '';
            var candidates = srcset.split(',').map(function(entry) {
              var parts = entry.trim().split(/\\s+/);
              return { url: parts[0], width: parts[1] ? parseInt(parts[1]) : 0 };
            });
            candidates.forEach(function(c) {
              if (c.width > bestWidth && c.url) { bestWidth = c.width; bestUrl = c.url; }
            });
            if (bestUrl === null) { var src = source.getAttribute('src'); if (src) bestUrl = src; }
          });
          return bestUrl;
        }
        var gallery =
          document.querySelector('[class*="product-detail-images"]') ||
          document.querySelector('[class*="pdp-gallery"]') ||
          document.querySelector('[class*="media-gallery"]') ||
          document.querySelector('main');
        if (!gallery) return [];
        var clone = gallery.cloneNode(true);
        var badPosters = [];
        clone.querySelectorAll('video').forEach(function(v) {
          var posterUrl = v.getAttribute('poster');
          if (posterUrl) badPosters.push(sanitizeAndUpscale(posterUrl));
          v.remove();
        });
        ['[class*="complete-the-look"]','[class*="cross-sell"]','[class*="recommendations"]',
         '[class*="carousel"]','footer','[class*="color-selector"]','[class*="product-detail-color"]',
         '[class*="thumbnail"]','[class*="swatch"]']
          .forEach(function(sel) { clone.querySelectorAll(sel).forEach(function(el) { el.remove(); }); });
        var seen = new Set(), images = [];
        clone.querySelectorAll('picture').forEach(function(picture) {
          var sources = Array.from(picture.querySelectorAll('source'));
          if (sources.length === 0) return;
          var rawUrl = pickHighestResFromSources(sources);
          var cleanUrl = sanitizeAndUpscale(rawUrl);
          if (cleanUrl && !seen.has(cleanUrl) && badPosters.indexOf(cleanUrl) === -1) {
            seen.add(cleanUrl); images.push(cleanUrl);
          }
        });
        if (images.length === 0) {
          clone.querySelectorAll('img').forEach(function(img) {
            var rawUrl = img.getAttribute('data-src') || img.getAttribute('src');
            var cleanUrl = sanitizeAndUpscale(rawUrl);
            if (cleanUrl && !seen.has(cleanUrl) && badPosters.indexOf(cleanUrl) === -1) {
              seen.add(cleanUrl); images.push(cleanUrl);
            }
          });
        }
        return images;
      })()
    `)) as string[];

    // ─── STEP 5: Videos ───────────────────────────────────────────────────────
    const cleanVideos = (await page
      .evaluate(
        `
      (function() {
        var videos = Array.from(document.querySelectorAll('video'));
        var validVideos = [];
        for (var i = 0; i < videos.length; i++) {
          var v = videos[i];
          if (v.closest('footer, [class*="recommendations"], [class*="cross-sell"], [class*="complete-the-look"], [class*="banner"]')) continue;
          var src = v.getAttribute('src') || v.getAttribute('data-src');
          if (!src) { var source = v.querySelector('source[type="video/mp4"], source'); if (source) src = source.getAttribute('src') || source.getAttribute('data-src'); }
          if (src && !src.startsWith('blob:')) {
            var lowerSrc = src.toLowerCase();
            if (!lowerSrc.includes('campaign') && !lowerSrc.includes('banner') && !lowerSrc.includes('promo') && !lowerSrc.includes('editorial') && !lowerSrc.includes('background')) {
              if (validVideos.indexOf(src) === -1) validVideos.push(src);
            }
          }
        }
        return validVideos;
      })()
    `,
      )
      .catch(() => [])) as string[];

    // ─── STEP 6: Sizes (back to restrictive — no images needed) ──────────────
    setMode(page, "restrictive");

    try {
      await page.evaluate(`
        (function() {
          var addBtn = document.querySelector('button[data-qa-action="add-to-cart"]');
          if (addBtn) addBtn.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 1000));
      await page.waitForSelector(".size-selector-sizes-size__label", {
        timeout: 10000,
      });
    } catch {}

    const sizes = (await page.evaluate(`
      (function() {
        return Array.from(document.querySelectorAll('.size-selector-sizes-size__label'))
          .map(function(el) { return el.textContent ? el.textContent.trim() : ''; })
          .filter(Boolean);
      })()
    `)) as string[];

    // ─── Assemble ─────────────────────────────────────────────────────────────
    const cleanColor = textData.color.split("|")[0].trim();
    const cleanComposition = textData.composition
      .replace(/^Composition:\s*/i, "")
      .trim();
    const finalPrice = parseUniversalPrice(textData.currentRaw) ?? 0;
    const finalOriginalPrice = textData.originalRaw
      ? parseUniversalPrice(textData.originalRaw)
      : undefined;

    console.log(
      `  --> Images: ${rawImages.length} | Price: ${finalPrice}${finalOriginalPrice ? ` (was ${finalOriginalPrice})` : ""} | Color: "${cleanColor}" | Name: ${textData.name}`,
    );

    setMode(page, "restrictive"); // always leave restrictive
    return {
      id: productId,
      name: textData.name,
      price: finalPrice,
      ...(finalOriginalPrice !== undefined && {
        originalPrice: finalOriginalPrice,
      }),
      currency: "TRY",
      brand: "Zara",
      images: rawImages,
      videos: cleanVideos.length > 0 ? cleanVideos : undefined,
      link: url,
      timestamp: new Date(),
      color: cleanColor,
      description: textData.description,
      composition: cleanComposition,
      sizes,
      category,
      department,
    };
  } catch (error: any) {
    // ─── Re-throw bot wall / timeout errors so the pipeline retry engine ──
    // can catch them, immediately run safeWipe(), and retry the same product.
    // Swallowing them here would make scrapeWithRetry receive null (a clean
    // skip) instead of a recoverable error, breaking the retry mechanism.
    if (
      error.message?.includes("BOT_WALL") ||
      error.message?.includes("TIMEOUT")
    ) {
      setMode(page, "restrictive");
      throw error;
    }
    console.error(`  --> ❌ Zara Scraper crashed on ${url}:`, error.message);
    setMode(page, "restrictive");
    return null;
  }
}

// ─── Category link getter ─────────────────────────────────────────────────────
export async function getProductLinksFromCategory(
  page: InterceptPage,
  url: string,
): Promise<string[]> {
  console.log(`   --> 🕵️‍♂️ Zara Scout (Lightweight Mode) visiting: ${url}`);
  setMode(page, "restrictive");

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page
      .waitForSelector("a.product-link", { timeout: 15000 })
      .catch(() => {
        console.log(
          `   --> ⚠️ Timed out waiting for product links. Trying anyway...`,
        );
      });

    const html = await page.content();
    const $ = cheerio.load(html);
    const links: string[] = [];
    $("a.product-link").each((_i, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("-p")) links.push(href.split("?")[0]);
    });

    const unique = [...new Set(links)];
    console.log(`   --> ✅ Success! Found ${unique.length} product links.`);
    return unique;
  } catch (error: any) {
    console.log(`   --> ⚠️ Error parsing HTML: ${error.message}`);
    return [];
  }
}

// ─── Category discovery ───────────────────────────────────────────────────────
export async function getZaraCategories(
  page: InterceptPage,
  department: string,
): Promise<string[]> {
  console.log("   --> 🕵️‍♂️ Crawler: Starting Category Discovery...");
  const deptLower =
    department.toLowerCase() === "women"
      ? "woman"
      : department.toLowerCase() === "men"
        ? "man"
        : department.toLowerCase();

  // ── STRATEGY 1: Sitemap (pure Node.js HTTP) ───────────────────────────────
  console.log("   --> 📋 [1/3] Sitemap strategy...");
  try {
    const sitemapCandidates = [
      "https://www.zara.com/sitemap.xml",
      "https://www.zara.com/sitemap_index.xml",
      "https://www.zara.com/tr/en/sitemap.xml",
    ];

    for (const url of sitemapCandidates) {
      const text = await fetchUrl(url);
      if (!text) {
        console.log(`   --> ⚠️ No response from ${url}`);
        continue;
      }

      const subUrls = (
        text.match(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g) ||
        []
      )
        .map((m) => {
          const match = m.match(/<loc>(.*?)<\/loc>/);
          return match ? match[1] : null;
        })
        .filter((u): u is string => !!u);

      if (subUrls.length > 0) {
        const trUrls = subUrls.filter(
          (u) => u.includes("-tr-") || u.includes("_tr") || u.includes("/tr/"),
        );
        const toTry = trUrls.length > 0 ? trUrls : subUrls.slice(0, 15);
        for (const subUrl of toTry) {
          const subText = await fetchUrl(subUrl);
          if (!subText) continue;
          const links = extractZaraCategoryLinks(subText, deptLower);
          if (links.length > 0) {
            console.log(
              `   --> ✅ [Sitemap] ${links.length} ${department} categories.`,
            );
            return links;
          }
        }
      } else {
        const links = extractZaraCategoryLinks(text, deptLower);
        if (links.length > 0) {
          console.log(
            `   --> ✅ [Sitemap] ${links.length} ${department} categories.`,
          );
          return links;
        }
      }
    }
    console.log("   --> ⚠️ [Sitemap] 0 matching links. Continuing...");
  } catch (e: any) {
    console.log(`   --> ⚠️ [Sitemap] ${e.message}`);
  }

  // ── Navigate once for strategies 2 & 3 ───────────────────────────────────
  setMode(page, "restrictive");
  try {
    await page.goto("https://www.zara.com/tr/en/", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await new Promise((r) => setTimeout(r, 5000));
    await handleGeoModal(page);
  } catch (e: any) {
    console.error(`  --> ❌ Navigation failed: ${e.message}`);
    return [];
  }

  // ── STRATEGY 2: Pre-rendered DOM ──────────────────────────────────────────
  console.log("   --> 🌐 [2/3] Pre-rendered DOM extraction...");
  try {
    const preRenderedLinks = await page.evaluate((dept) => {
      const patterns = [`/${dept}-`];
      const blocked = [
        "mkt",
        "beauty",
        "editorial",
        "campaign",
        "newsletter",
        "spring-getaway",
        "best-sellers",
        "collections",
        "join-life",
      ];
      return [
        ...new Set(
          Array.from(document.querySelectorAll("a"))
            .map((el) => (el as HTMLAnchorElement).href)
            .filter(
              (href) =>
                href &&
                !href.includes("-p") &&
                patterns.some((p) => href.includes(p)) &&
                !blocked.some((w) => href.toLowerCase().includes(w)),
            ),
        ),
      ];
    }, deptLower);

    if (preRenderedLinks.length > 0) {
      console.log(
        `   --> ✅ [DOM] ${preRenderedLinks.length} ${department} categories (no menu needed).`,
      );
      return preRenderedLinks;
    }
    console.log("   --> ⚠️ [DOM] 0 links. Opening menu...");
  } catch (e: any) {
    console.log(`   --> ⚠️ [DOM] ${e.message}`);
  }

  // ── STRATEGY 3: JS menu click ─────────────────────────────────────────────
  console.log("   --> 🍔 [3/3] Menu strategy...");
  try {
    const clickedSelector = await page.evaluate(() => {
      const candidates = [
        ".layout-desktop-open-menu",
        ".layout-catalog-desktop-menu__open-menu",
        ".layout-open-menu-base",
        "[data-qa-action='layout-desktop-open-menu-trigger']",
        "button[aria-label='Open menu']",
        "button[aria-label='Menu']",
        "[aria-label='Menu']",
      ];
      for (const sel of candidates) {
        const el = document.querySelector(sel) as HTMLElement;
        if (el) {
          el.click();
          return sel;
        }
      }
      return null;
    });

    if (clickedSelector) {
      console.log(`   --> ✅ Hamburger clicked via: ${clickedSelector}`);
    } else {
      console.log("   --> ⚠️ No hamburger element found in DOM.");
    }

    await new Promise((r) => setTimeout(r, 5000));

    // Select department
    try {
      const clicked = await page.evaluate((dept) => {
        const target = Array.from(
          document.querySelectorAll("a, button, li, span"),
        ).find(
          (el) =>
            el.textContent?.trim().toUpperCase() === dept.toUpperCase() &&
            (el as HTMLElement).offsetParent !== null,
        );
        if (target) {
          (target as HTMLElement).click();
          return true;
        }
        return false;
      }, department);
      if (clicked) {
        console.log(`   --> ${department} Department Selected.`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch {}

    await new Promise((r) => setTimeout(r, 4000));

    const links = await page.evaluate((dept) => {
      return [
        ...new Set(
          Array.from(document.querySelectorAll("a"))
            .map((el) => (el as HTMLAnchorElement).href)
            .filter(
              (href) =>
                href && !href.includes("-p") && href.includes(`/${dept}-`),
            ),
        ),
      ];
    }, deptLower);

    console.log(`   --> 🕵️‍♂️ Found ${links.length} categories via menu.`);
    return links;
  } catch (error: any) {
    console.error(`  --> ❌ Category crawler failed: ${error.message}`);
    return [];
  }
}
