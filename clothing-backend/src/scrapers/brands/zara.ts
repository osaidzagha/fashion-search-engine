import { Page } from "puppeteer";
import { Product } from "../interface";

import https from "https";

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
        // Follow one redirect
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

  // Case 1: String has BOTH a dot and a comma (e.g., 1.790,00 or 1,790.00)
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // TR/EU Format: 1.790,00 -> Remove dot, change comma to decimal
      cleanStr = cleanStr.replace(/\./g, "").replace(",", ".");
    } else {
      // US Format: 1,790.00 -> Remove comma
      cleanStr = cleanStr.replace(/,/g, "");
    }
  }
  // Case 2: String has ONLY a dot (e.g., 2.990 or 29.90)
  else if (lastDot > -1 && lastComma === -1) {
    // If exactly 3 digits follow the dot, it is a thousands separator, NOT a decimal
    if (cleanStr.length - lastDot === 4) {
      cleanStr = cleanStr.replace(/\./g, ""); // "2.990" -> "2990"
    }
  }
  // Case 3: String has ONLY a comma (e.g., 2990,00)
  else if (lastComma > -1 && lastDot === -1) {
    cleanStr = cleanStr.replace(",", "."); // "2990,00" -> "2990.00"
  }

  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? undefined : parsed;
}

// 1. Replace selectDepartment — remove className check
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

export async function scrapeZaraProductData(
  page: Page,
  url: string,
  category: string = "",
  department: string = "",
): Promise<Product | null> {
  try {
    const match = url.match(/-p([a-zA-Z0-9]+)\.html/);
    if (!match) {
      console.log(`  --> ⚠️ No ID found in URL, skipping: ${url}`);
      return null;
    }
    const productId = match[1];

    // 👇 FIX: Added explicit 120s timeout
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    try {
      // 👇 FIX: Bumped timeout to 25s
      await page.waitForSelector("h1", { timeout: 25000 });
    } catch {
      return null;
    }

    // ─── STEP 1: Wait for JS hydration at page top ───────────────────────────
    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var maxWait = 10000; // 👇 FIX: Bumped to 25s to let Render CPU catch up
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

    // ─── STEP 2: Read ALL text data while page is still at top ───────────────
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

    await new Promise((r) => setTimeout(r, 2000)); // was: waitForNetworkIdle 20s

    // ─── STEP 4: Read images after scroll & GHOST FRAME DEFENSE ──────────────
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

    // ─── STEP 5: Videos (Extract ALL valid videos) ────────────────────────────
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

    // ─── STEP 6: Sizes — click add-to-cart to reveal selector ─────────────────
    try {
      await page.evaluate(`
        (function() {
          var addBtn = document.querySelector('button[data-qa-action="add-to-cart"]');
          if (addBtn) addBtn.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 1000));
      // 👇 FIX: Bumped timeout
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
    return null;
  }
}

export async function getProductLinksFromCategory(
  page: Page,
  url: string,
): Promise<string[]> {
  console.log(`   --> 🕵️‍♂️ Zara Scout visiting: ${url}`);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });

    // Wait longer for JS hydration on Render's slow CPU
    await new Promise((r) => setTimeout(r, 6000)); // was 4000

    try {
      // Wait for the product grid container first, then individual links
      await page.waitForSelector('[class*="product-grid-product"]', {
        timeout: 30000, // was 25000 on .product-link
      });
    } catch (e) {
      console.log("  --> ⚠️ Product grid didn't appear. Forcing scroll...");
    }

    let productLinks: string[] = [];
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`  --> 🔄 Attempt ${attempt} to extract Zara links...`);
      console.log("  --> 📜 Auto-scrolling to trigger lazy load...");

      await page.evaluate(`
        (function() {
          return new Promise(function(resolve) {
            var totalHeight = 0;
            var distance = 600;
            var scrolls = 0;
            var maxScrolls = 30;
            var timer = setInterval(function() {
              var scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;
              scrolls++;
              if (totalHeight >= scrollHeight || scrolls >= maxScrolls) {
                clearInterval(timer);
                resolve(undefined);
              }
            }, 800);
          });
        })()
      `);

      await new Promise((r) => setTimeout(r, 3000)); // was 2000

      productLinks = (await page.evaluate(`
        (function() {
          return Array.from(document.querySelectorAll('.product-link'))
            .map(function(el) { return el.href; })
            .filter(function(href) { return href && href.includes('-p'); })
            .map(function(href) { return href.split('?')[0]; })
            .filter(function(href, index, self) { return self.indexOf(href) === index; });
        })()
      `)) as string[];

      if (productLinks.length > 0) {
        console.log(
          `  --> ✅ Success! Found ${productLinks.length} product links.`,
        );
        break;
      }

      console.log(`  --> ⚠️ Found 0 links on attempt ${attempt}. Waiting...`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 4000)); // was 3000
    }

    return productLinks;
  } catch (error: any) {
    console.log(`  --> ⚠️ Error finding links: ${error.message}`);
    return [];
  }
}

export async function getZaraCategories(
  page: Page,
  department: string,
): Promise<string[]> {
  console.log("   --> 🕵️‍♂️ Crawler: Starting Category Discovery...");
  const deptLower = department.toLowerCase(); // "man" or "woman"

  // ── STRATEGY 1: Sitemap via Node.js (no browser context, no redirect risk) ─
  console.log("   --> 📋 Trying sitemap strategy...");
  try {
    const sitemapCandidates = [
      "https://www.zara.com/sitemap.xml",
      "https://www.zara.com/sitemap_index.xml",
      "https://www.zara.com/tr/en/sitemap.xml",
    ];

    for (const sitemapUrl of sitemapCandidates) {
      console.log(`   --> 🗺️  Checking: ${sitemapUrl}`);
      const text = await fetchUrl(sitemapUrl);
      if (!text) {
        console.log("   --> ⚠️ No response, skipping.");
        continue;
      }

      // Is it a sitemap index? Drill into sub-sitemaps
      const subUrlMatches =
        text.match(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g) ||
        [];
      if (subUrlMatches.length > 0) {
        const subUrls = subUrlMatches
          .map((m) => {
            const match = m.match(/<loc>(.*?)<\/loc>/);
            return match ? match[1] : null;
          })
          .filter((u): u is string => !!u);

        // Prefer TR-locale sub-sitemaps, fall back to all
        const trSubUrls = subUrls.filter(
          (u) => u.includes("-tr-") || u.includes("_tr") || u.includes("/tr/"),
        );
        const toTry = trSubUrls.length > 0 ? trSubUrls : subUrls.slice(0, 15);

        for (const subUrl of toTry) {
          const subText = await fetchUrl(subUrl);
          if (!subText) continue;
          const links = extractZaraCategoryLinks(subText, deptLower);
          if (links.length > 0) {
            console.log(
              `   --> ✅ Sitemap found ${links.length} ${department} categories.`,
            );
            return links;
          }
        }
      }

      // Not an index — try extracting directly
      const directLinks = extractZaraCategoryLinks(text, deptLower);
      if (directLinks.length > 0) {
        console.log(
          `   --> ✅ Sitemap found ${directLinks.length} ${department} categories.`,
        );
        return directLinks;
      }
    }

    console.log("   --> ⚠️ Sitemap returned 0 links. Falling back to menu...");
  } catch (e: any) {
    console.log(
      `   --> ⚠️ Sitemap error: ${e.message}. Falling back to menu...`,
    );
  }

  // ── STRATEGY 2: Menu navigation — correct selector, single click ──────────
  console.log("   --> 🍔 Trying menu strategy...");
  try {
    await page.goto("https://www.zara.com/tr/en/", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await new Promise((r) => setTimeout(r, 5000));
    await handleGeoModal(page);

    // ─ Use the ACTUAL class from Zara's HTML (not aria-label which didn't match)
    const menuSelector =
      ".layout-desktop-open-menu, .layout-catalog-desktop-menu__open-menu, .layout-open-menu-base";

    await page
      .waitForSelector(menuSelector, { visible: true, timeout: 20000 })
      .catch(() =>
        console.log(
          "   --> ⚠️ Menu button not immediately visible, clicking anyway...",
        ),
      );

    // ─ Click ONCE (it's a toggle — the old 3-retry loop was opening/closing/opening)
    await page.evaluate((selector) => {
      const btn = document.querySelector(selector) as HTMLElement;
      if (btn) {
        console.log("   --> Hamburger found:", btn.className);
        btn.click();
      } else {
        console.log("   --> ⚠️ Hamburger element not found by selector.");
      }
    }, menuSelector);

    console.log("   --> 🔓 Menu clicked. Waiting for panel to render...");
    await new Promise((r) => setTimeout(r, 5000)); // generous wait for React re-render

    // ─ Verify menu opened using Zara-specific panel classes ─
    const menuIsOpen = await page.evaluate(() => {
      // Check for the catalog panel Zara renders when menu is open
      const panel = document.querySelector(
        '[class*="layout-catalog-desktop-menu__panel"], [class*="catalog-menu__panel"], [class*="layout-catalog-desktop"], [class*="zds-layout-desktop__center"]',
      );
      if (panel) return { open: true, via: "panel" };

      // Fallback: any Zara category link is now visible in the DOM
      const catLinks = Array.from(document.querySelectorAll("a")).filter(
        (a) =>
          a.href &&
          (a.href.includes("/man-") ||
            a.href.includes("/woman-") ||
            a.href.includes("/kids-")),
      );
      if (catLinks.length > 0) return { open: true, via: "category links" };

      return { open: false, via: "none" };
    });

    console.log(
      `   --> Menu open: ${menuIsOpen.open} (detected via: ${menuIsOpen.via})`,
    );

    // ─ If still closed, one recovery click (it might have been already open and we toggled it shut)
    if (!menuIsOpen.open) {
      console.log("   --> ⚠️ Menu closed. One recovery click...");
      await page.evaluate((selector) => {
        const btn = document.querySelector(selector) as HTMLElement;
        if (btn) btn.click();
      }, menuSelector);
      await new Promise((r) => setTimeout(r, 5000));
    }

    // ─ Department selection (best-effort, proceed even if it fails) ─
    await selectDepartment(page, department);
    await new Promise((r) => setTimeout(r, 4000));

    // ─ Extract all category links matching the department ─
    const links = await page.evaluate((dept) => {
      const patterns = [`/${dept}-`, dept === "man" ? "/men-" : "/women-"];
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
