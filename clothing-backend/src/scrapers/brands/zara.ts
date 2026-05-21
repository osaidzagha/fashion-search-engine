import { Page } from "puppeteer";
import { Product } from "../interface";

import https from "https";
import * as cheerio from "cheerio";
// Node.js-side fetch — immune to browser context destruction
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

// Pure regex — no DOMParser needed in Node.js
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

  // Case 1: Both dot and comma (e.g., 1.790,00 or 1,790.00)
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // TR/EU: 1.790,00 → 1790.00
      cleanStr = cleanStr.replace(/\./g, "").replace(",", ".");
    } else {
      // US: 1,790.00 → 1790.00
      cleanStr = cleanStr.replace(/,/g, "");
    }
  }
  // Case 2: Only dot (e.g., 2.990 or 29.90)
  else if (lastDot > -1 && lastComma === -1) {
    if (cleanStr.length - lastDot === 4) {
      cleanStr = cleanStr.replace(/\./g, ""); // "2.990" → "2990"
    }
  }
  // Case 3: Only comma (e.g., 2990,00)
  else if (lastComma > -1 && lastDot === -1) {
    cleanStr = cleanStr.replace(",", "."); // "2990,00" → "2990.00"
  }

  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? undefined : parsed;
}

async function selectDepartment(page: Page, department: string) {
  console.log(`Switching to ${department} department...`);
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
    } else {
      console.log(
        `   --> ⚠️ Failed to click ${department} department. Proceeding anyway...`,
      );
    }
  } catch {
    console.log(`   --> ⚠️ Failed to click ${department} department.`);
  }
}

async function handleGeoModal(page: Page) {
  console.log("   --> Checking for Geo-Location Modal...");
  try {
    const stayButtonSelector = '[data-qa-action="stay-in-store"]';
    await page.waitForSelector(stayButtonSelector, { timeout: 3000 });
    console.log("   --> Modal Detected! Clicking 'Stay in Turkey'...");
    await page.click(stayButtonSelector);
    await new Promise((r) => setTimeout(r, 1000));
    console.log("   --> Modal Dismissed.");
  } catch (e) {
    console.log("   --> No modal found (Safe to proceed).");
  }
}

// ─── Shared geo-wall check ────────────────────────────────────────────────────
function isGeoWallPage(title: string, bodyText: string): boolean {
  return (
    title === "ZARA Official Website" ||
    bodyText.includes("SELECT YOUR LOCATION") ||
    bodyText.includes("select your location")
  );
}

export async function scrapeZaraProductData(
  page: Page,
  url: string,
  category: string = "",
  department: string = "",
): Promise<Product | null> {
  try {
    await page.setRequestInterception(false);
    const match = url.match(/-p([a-zA-Z0-9]+)\.html/);
    if (!match) {
      console.log(`  --> ⚠️ No ID found in URL, skipping: ${url}`);
      return null;
    }
    const productId = match[1];

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 });
    } catch (e: any) {
      console.log(
        `  --> ⚠️ Page load timed out or interrupted. Checking if DOM is usable anyway...`,
      );
    }

    try {
      await page.waitForSelector("h1", { timeout: 15000 });
    } catch {
      console.log(
        `  --> ❌ Page completely failed to load (Bot Blocked or Blank). Skipping.`,
      );
      return null;
    }

    // ─── STEP 1: Wait for JS hydration ───────────────────────────────────────
    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var maxWait = 10000;
          var waited = 0;
          var interval = setInterval(function() {
            var descEl  = document.querySelector('.product-detail-description');
            var colorEl = document.querySelector('.product-color-extended-name');
            var priceEl = document.querySelector('.money-amount__main, .price__amount');
            
            var descReady  = descEl  && descEl.textContent  && descEl.textContent.trim().length  > 0;
            var colorReady = colorEl && colorEl.textContent && colorEl.textContent.trim().length > 0;
            var priceReady = priceEl && /[0-9]/.test(priceEl.textContent);
            
            waited += 100;
            if ((descReady && colorReady && priceReady) || waited >= maxWait) {
              clearInterval(interval);
              resolve(undefined);
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

        var name = getText('h1.product-detail-info__header-name') || getText('h1');
        var description = getText('.product-detail-description') || getText('[class*="product-detail-info__description"]');
        var color = getText('.product-color-extended-name') || getText('[class*="color-extended"]');

        var compItems = Array.from(document.querySelectorAll('.product-detail-composition__item.product-detail-composition__part'));
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
            .map(function(el) { return el.textContent ? el.textContent.trim() : ''; })
            .filter(Boolean);
          
          if (allPrices.length >= 2) {
            originalRaw = originalRaw || allPrices[0];
            currentRaw = currentRaw || allPrices[allPrices.length - 1];
          } else if (allPrices.length === 1) {
            currentRaw = currentRaw || allPrices[0];
          }
        }
          
        return {
          name:        name,
          description: description,
          color:       color,
          composition: composition,
          currentRaw:  currentRaw,
          originalRaw: originalRaw,
        };
      })()
    `)) as {
      name: string;
      description: string;
      color: string;
      composition: string;
      currentRaw: string;
      originalRaw: string;
    };

    // ─── STEP 3: Deep scroll to trigger lazy-loaded images ───────────────────
    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var totalHeight = 0;
          var distance = 300;
          var timer = setInterval(function() {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= document.body.scrollHeight - window.innerHeight || totalHeight > 8000) {
              clearInterval(timer);
              resolve(undefined);
            }
          }, 300);
        });
      })()
    `);

    await new Promise((r) => setTimeout(r, 2000));

    // ─── STEP 4: Read images after scroll ────────────────────────────────────
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
          var bestUrl = null;
          var bestWidth = -1;
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

        ['[class*="complete-the-look"]','[class*="cross-sell"]',
         '[class*="recommendations"]','[class*="carousel"]','footer',
         '[class*="color-selector"]', '[class*="product-detail-color"]',
         '[class*="thumbnail"]', '[class*="swatch"]']
          .forEach(function(sel) {
            clone.querySelectorAll(sel).forEach(function(el) { el.remove(); });
          });

        var seen = new Set();
        var images = [];

        clone.querySelectorAll('picture').forEach(function(picture) {
          var sources = Array.from(picture.querySelectorAll('source'));
          if (sources.length === 0) return;
          var rawUrl = pickHighestResFromSources(sources);
          var cleanUrl = sanitizeAndUpscale(rawUrl);
          if (cleanUrl && !seen.has(cleanUrl) && badPosters.indexOf(cleanUrl) === -1) { 
            seen.add(cleanUrl); 
            images.push(cleanUrl); 
          }
        });

        if (images.length === 0) {
          clone.querySelectorAll('img').forEach(function(img) {
            var rawUrl = img.getAttribute('data-src') || img.getAttribute('src');
            var cleanUrl = sanitizeAndUpscale(rawUrl);
            if (cleanUrl && !seen.has(cleanUrl) && badPosters.indexOf(cleanUrl) === -1) { 
              seen.add(cleanUrl); 
              images.push(cleanUrl); 
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
          if (v.closest('footer, [class*="recommendations"], [class*="cross-sell"], [class*="complete-the-look"], [class*="banner"]')) {
            continue;
          }

          var src = v.getAttribute('src') || v.getAttribute('data-src');
          if (!src) {
            var source = v.querySelector('source[type="video/mp4"], source');
            if (source) {
              src = source.getAttribute('src') || source.getAttribute('data-src');
            }
          }

          if (src && !src.startsWith('blob:')) {
            var lowerSrc = src.toLowerCase();
            if (
              !lowerSrc.includes('campaign') && 
              !lowerSrc.includes('banner') && 
              !lowerSrc.includes('promo') &&
              !lowerSrc.includes('editorial') &&
              !lowerSrc.includes('background')
            ) {
              if (validVideos.indexOf(src) === -1) {
                validVideos.push(src);
              }
            }
          }
        }
        return validVideos;
      })()
    `,
      )
      .catch(() => [])) as string[];

    // ─── STEP 6: Sizes ────────────────────────────────────────────────────────
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
    } catch (e) {}

    const sizes = (await page.evaluate(`
      (function() {
        return Array.from(document.querySelectorAll('.size-selector-sizes-size__label'))
          .map(function(el) { return el.textContent ? el.textContent.trim() : ''; })
          .filter(Boolean);
      })()
    `)) as string[];

    // ─── Assemble ─────────────────────────────────────────────────────────────
    const rawName = textData.name;
    const rawDescription = textData.description;
    const cleanColor = textData.color.split("|")[0].trim();
    const cleanComposition = textData.composition
      .replace(/^Composition:\s*/i, "")
      .trim();
    const finalPrice = parseUniversalPrice(textData.currentRaw) ?? 0;
    const finalOriginalPrice = textData.originalRaw
      ? parseUniversalPrice(textData.originalRaw)
      : undefined;

    console.log(
      `  --> Images: ${rawImages.length} | Price: ${finalPrice}${finalOriginalPrice ? ` (was ${finalOriginalPrice})` : ""} | Color: "${cleanColor}" | Name: ${rawName}`,
    );
    await page.setRequestInterception(true);
    return {
      id: productId,
      name: rawName,
      price: finalPrice,
      ...(finalOriginalPrice !== undefined && {
        originalPrice: finalOriginalPrice,
      }),
      currency: "TRY",
      brand: "Zara",
      // @ts-ignore
      images: rawImages,
      videos: cleanVideos.length > 0 ? cleanVideos : undefined,
      link: url,
      timestamp: new Date(),
      color: cleanColor,
      description: rawDescription,
      composition: cleanComposition,
      sizes: sizes,
      category: category,
      department: department,
    };
  } catch (error: any) {
    console.error(`  --> ❌ Zara Scraper crashed on ${url}:`);
    console.error(error);
    await page.setRequestInterception(true).catch(() => {});
    return null;
  }
}

export async function getProductLinksFromCategory(
  page: Page,
  url: string,
): Promise<string[]> {
  console.log(`   --> 🕵️‍♂️ Zara Scout (Lightweight Mode) visiting: ${url}`);

  try {
    await page.setRequestInterception(true);

    // Remove existing listener first to avoid duplicates
    page.removeAllListeners("request");

    page.on("request", (req) => {
      try {
        if (req.isNavigationRequest() || req.resourceType() === "script") {
          req.continue();
        } else {
          req.abort();
        }
      } catch {}
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page
      .waitForSelector("a.product-link", { timeout: 15000 })
      .catch(() => {
        console.log(
          `   --> ⚠️ Timed out waiting for product links. Trying anyway...`,
        );
      });

    const html = await page.content();

    // ✅ Clean up — disable interception for next user of this page
    page.removeAllListeners("request");
    await page.setRequestInterception(false);

    const $ = cheerio.load(html);
    const links: string[] = [];
    $("a.product-link").each((i, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("-p")) {
        links.push(href.split("?")[0]);
      }
    });

    const uniqueLinks = [...new Set(links)];
    console.log(
      `   --> ✅ Success! Found ${uniqueLinks.length} product links.`,
    );
    return uniqueLinks;
  } catch (error: any) {
    page.removeAllListeners("request");
    await page.setRequestInterception(false).catch(() => {});
    console.log(`   --> ⚠️ Error parsing HTML: ${error.message}`);
    return [];
  }
}
export async function getZaraCategories(
  page: Page,
  department: string,
): Promise<string[]> {
  console.log("   --> 🕵️‍♂️ Crawler: Starting Category Discovery...");
  const deptLower =
    department.toLowerCase() === "women"
      ? "woman"
      : department.toLowerCase() === "men"
        ? "man"
        : department.toLowerCase();

  // ── STRATEGY 1: Node.js sitemap (pure HTTP, no browser context risk) ───────
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

      console.log(`   --> ✉️ ${url} → ${text.length} bytes`);

      const sampleLocs = (text.match(/<loc>(.*?)<\/loc>/g) || [])
        .slice(0, 5)
        .map((m) => m.replace(/<\/?loc>/g, ""));
      console.log(`   --> 🔍 Sample locs: ${JSON.stringify(sampleLocs)}`);

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
        console.log(`   --> 📑 Sitemap index: ${subUrls.length} sub-sitemaps.`);
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

  // ── Single navigation — shared by strategies 2 and 3 ─────────────────────
  // Note: pipeline's safeWipe already warmed up this page, but getZaraCategories
  // needs to navigate to the homepage anyway to extract nav links.
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
      return [
        ...new Set(
          Array.from(document.querySelectorAll("a"))
            .map((el) => (el as HTMLAnchorElement).href)
            .filter((href) => {
              if (!href) return false;
              if (href.includes("-p")) return false;

              const isDepartment = patterns.some((p) => href.includes(p));
              const blockedWords = [
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
              const isBlocked = blockedWords.some((w) =>
                href.toLowerCase().includes(w),
              );

              return isDepartment && !isBlocked;
            }),
        ),
      ];
    }, deptLower);

    if (preRenderedLinks.length > 0) {
      console.log(
        `   --> ✅ [DOM] ${preRenderedLinks.length} ${department} categories (no menu needed).`,
      );
      return preRenderedLinks;
    }
    console.log(
      "   --> ⚠️ [DOM] 0 links in pre-rendered HTML. Opening menu...",
    );
  } catch (e: any) {
    console.log(`   --> ⚠️ [DOM] ${e.message}`);
  }

  // ── STRATEGY 3: JS-based menu click ───────────────────────────────────────
  console.log("   --> 🍔 [3/3] Menu strategy...");
  try {
    const clickedSelector = await page.evaluate(() => {
      const candidates = [
        ".layout-desktop-open-menu",
        ".layout-catalog-desktop-menu__open-menu",
        ".layout-open-menu-base",
        "[data-qa-action='layout-desktop-open-menu-trigger']",
        "[data-qa-id='layout-desktop-open-menu-trigger']",
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
    await selectDepartment(page, department);
    await new Promise((r) => setTimeout(r, 4000));

    const links = await page.evaluate((dept) => {
      const patterns = [`/${dept}-`];
      return [
        ...new Set(
          Array.from(document.querySelectorAll("a"))
            .map((el) => (el as HTMLAnchorElement).href)
            .filter(
              (href) =>
                href &&
                !href.includes("-p") &&
                patterns.some((p) => href.includes(p)),
            ),
        ),
      ];
    }, deptLower);

    const uniqueLinks = [...new Set(links)];
    console.log(`   --> 🕵️‍♂️ Found ${uniqueLinks.length} categories via menu.`);
    return uniqueLinks;
  } catch (error: any) {
    console.error(`  --> ❌ Category crawler failed: ${error.message}`);
    return [];
  }
}
