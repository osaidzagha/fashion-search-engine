import { Page } from "puppeteer";
import { Product } from "../interface";

function parseUniversalPrice(rawPrice: string): number {
  const cleanStr = rawPrice.replace(/[^\d.,]/g, "");
  if (!cleanStr) return 0;
  const lastComma = cleanStr.lastIndexOf(",");
  const lastDot = cleanStr.lastIndexOf(".");
  if (lastComma > lastDot) {
    const noDots = cleanStr.replace(/\./g, "");
    return parseFloat(noDots.replace(",", ".")) || 0;
  } else {
    const noCommas = cleanStr.replace(/,/g, "");
    return parseFloat(noCommas) || 0;
  }
}

async function selectDepartment(page: Page, department: string) {
  console.log(`Switching to ${department} department...`);
  const xpath = `::-p-xpath(//span[@class='layout-categories-category-name' and text()='${department}'])`;
  try {
    const targetElement = await page.waitForSelector(xpath, { timeout: 5000 });
    if (targetElement) {
      await page.evaluate((el) => {
        // @ts-ignore
        el.click();
      }, targetElement);
    }
    await new Promise((r) => setTimeout(r, 2000));
    console.log(`   --> ${department} Department Selected.`);
  } catch (error) {
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
    const match = url.match(/-p(\d+)\.html/);
    if (!match) {
      console.log(`  --> ⚠️ No ID found in URL, skipping: ${url}`);
      return null;
    }
    const productId = match[1];

    await page.goto(url, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForSelector("h1", { timeout: 5000 });
    } catch {
      return null;
    }

    // ─── STEP 1: Wait for JS hydration at page top ───────────────────────────
    // Page is at top, description/color/composition are rendered in viewport.
    // Poll until they have text — bail after 8s (some products genuinely lack them).
    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var maxWait = 8000;
          var waited = 0;
          var interval = setInterval(function() {
            var descEl  = document.querySelector('.product-detail-description');
            var colorEl = document.querySelector('.product-color-extended-name');
            var descReady  = descEl  && descEl.textContent  && descEl.textContent.trim().length  > 0;
            var colorReady = colorEl && colorEl.textContent && colorEl.textContent.trim().length > 0;
            waited += 100;
            if ((descReady && colorReady) || waited >= maxWait) {
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

        var name =
          getText('h1.product-detail-info__header-name') ||
          getText('h1');

        var description =
          getText('.product-detail-description.product-detail-info__description') ||
          getText('.product-detail-description') ||
          getText('[class*="product-detail-info__description"]');

        var color =
          getText('.product-color-extended-name.product-detail-info__color') ||
          getText('.product-color-extended-name') ||
          getText('[class*="color-extended"]');

        var compItems = Array.from(document.querySelectorAll(
          '.product-detail-composition__item.product-detail-composition__part'
        ));
        var composition = compItems.length > 0
          ? compItems
              .map(function(el) { return el.textContent ? el.textContent.replace(/\\s+/g, ' ').trim() : ''; })
              .filter(Boolean)
              .join(', ')
          : getText('.product-detail-composition.product-detail-view__detailed-composition') ||
            getText('.product-detail-composition');

        function getText2(selector) {
          var el = document.querySelector(selector);
          return el && el.textContent ? el.textContent.trim() : '';
        }
        var currentRaw =
          getText2('.price-current__amount .money-amount__main') ||
          getText2('.price-current .money-amount__main') ||
          getText2('.money-amount--highlight .money-amount__main') ||
          getText2('.money-amount__main') ||
          getText2('.price__amount-current') ||
          getText2('.price__amount');
        var originalRaw =
          getText2('.price__amount--old-price-wrapper .money-amount__main') ||
          getText2('.price__amount--old-price-wrapper');

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

    await page
      .waitForNetworkIdle({ idleTime: 1500, timeout: 10_000 })
      .catch(() => {});

    // ─── STEP 4: Read images after scroll ────────────────────────────────────
    const rawImages = (await page.evaluate(`
      (function() {
        function sanitizeAndUpscale(url) {
          if (!url) return null;
          if (url.startsWith('data:')) return null;
          if (url.endsWith('.svg') || url.includes('placeholder')) return null;
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
        ['[class*="complete-the-look"]','[class*="cross-sell"]',
         '[class*="recommendations"]','[class*="carousel"]','footer']
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
          if (cleanUrl && !seen.has(cleanUrl)) { seen.add(cleanUrl); images.push(cleanUrl); }
        });
        if (images.length === 0) {
          clone.querySelectorAll('img').forEach(function(img) {
            var rawUrl = img.getAttribute('data-src') || img.getAttribute('src');
            var cleanUrl = sanitizeAndUpscale(rawUrl);
            if (cleanUrl && !seen.has(cleanUrl)) { seen.add(cleanUrl); images.push(cleanUrl); }
          });
        }
        return images;
      })()
    `)) as string[];

    // ─── STEP 5: Video ────────────────────────────────────────────────────────
    const cleanVideo = (await page
      .evaluate(
        `
      (function() {
        var v =
          document.querySelector('video source[type="video/mp4"]') ||
          document.querySelector('video.media-video__video') ||
          document.querySelector('video');
        if (!v) return null;
        var src = v.getAttribute('src') || v.getAttribute('data-src');
        if (src && !src.startsWith('blob:')) return src;
        return null;
      })()
    `,
      )
      .catch(() => null)) as string | null;

    // ─── STEP 6: Sizes — click add-to-cart to reveal selector ─────────────────
    try {
      await page.evaluate(`
        (function() {
          var addBtn = document.querySelector('button[data-qa-action="add-to-cart"]');
          if (addBtn) addBtn.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 1000));
      await page.waitForSelector(".size-selector-sizes-size__label", {
        timeout: 3000,
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
    const finalPrice = parseUniversalPrice(textData.currentRaw);
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
      video: cleanVideo || undefined,
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
  console.log(`   --> Zara Scout visiting: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForSelector(".product-link", { timeout: 5000 });
    const links = (await page.evaluate(`
      (function() {
        return Array.from(document.querySelectorAll('.product-link'))
          .map(function(el) { return el.href; })
          .filter(function(href) { return href !== ''; });
      })()
    `)) as string[];
    return [...new Set(links)];
  } catch (error) {
    return [];
  }
}

export async function getZaraCategories(
  page: Page,
  department: string,
): Promise<string[]> {
  console.log("   --> 🕵️‍♂️ Crawler: Starting Category Discovery...");
  try {
    await page.goto("https://www.zara.com/tr/en/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await handleGeoModal(page);

    const menuButtonSelector =
      '[data-qa-id="layout-desktop-open-menu-trigger"]';
    await page.waitForSelector(menuButtonSelector);
    await page.click(menuButtonSelector);

    await selectDepartment(page, department);

    const linkSelector = ".layout-categories-category-wrapper";
    await page.waitForSelector(linkSelector);

    const deptLower = department.toLowerCase();

    const links = (await page.evaluate(`
      (function() {
        return Array.from(document.querySelectorAll('.layout-categories-category-wrapper'))
          .map(function(el) { return el.href; })
          .filter(function(href) { return href && href.includes('/${deptLower}-'); });
      })()
    `)) as string[];

    const uniqueLinks = [...new Set(links)];
    console.log(`   --> 🕵️‍♂️ Found ${uniqueLinks.length} categories.`);
    return uniqueLinks;
  } catch (error: any) {
    console.error(`  --> ❌ Category crawler failed: ${error.message}`);
    return [];
  }
}
