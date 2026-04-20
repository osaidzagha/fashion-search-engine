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

    // ─── STEP 1: Poll for text hydration while page is at top ─────────────────
    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var maxWait = 8000;
          var waited = 0;
          var interval = setInterval(function() {
            var descEl  = document.querySelector('.product-detail-description');
            var colorEl = document.querySelector('.product-color-extended-name');
            var descReady  = descEl  && descEl.textContent  && descEl.textContent.trim().length > 0;
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

    // ─── STEP 2: Read ALL text + price in one snapshot ────────────────────────
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

        var currentRaw =
          getText('.price-current__amount .money-amount__main') ||
          getText('.price-current .money-amount__main') ||
          getText('.money-amount--highlight .money-amount__main') ||
          getText('.money-amount__main') ||
          getText('.price__amount-current') ||
          getText('.price__amount');

        var originalRaw =
          getText('.price__amount--old-price-wrapper .money-amount__main') ||
          getText('.price__amount--old-price-wrapper');

        return {
          name: name,
          description: description,
          color: color,
          composition: composition,
          currentRaw: currentRaw,
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

    // ─── STEP 3: Slow scroll through gallery to hydrate all media items ────────
    // Zara renders each .product-detail-image__image lazily as it enters viewport.
    // We scroll slowly so every item gets a chance to load before we read them.
    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var totalHeight = 0;
          var distance = 200;
          var timer = setInterval(function() {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= document.body.scrollHeight - window.innerHeight || totalHeight > 12000) {
              clearInterval(timer);
              resolve(undefined);
            }
          }, 250);
        });
      })()
    `);

    // Wait for network to settle so lazy images finish downloading
    await page
      .waitForNetworkIdle({ idleTime: 2000, timeout: 12_000 })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 500));

    // ─── STEP 4: Extract ALL media from .product-detail-image__image items ────
    // Each item is either an image or a video. We read both in one pass.
    const mediaData = (await page.evaluate(`
      (function() {
        function sanitizeUrl(url) {
          if (!url) return null;
          if (url.startsWith('data:') || url.endsWith('.svg') || url.includes('placeholder')) return null;
          // Force /w/1024/ for consistent high-res
          return url.replace(/\\/w\\/\\d+\\//g, '/w/1024/');
        }

        function pickHighestResFromSrcset(srcset) {
          if (!srcset) return null;
          var best = null;
          var bestWidth = -1;
          srcset.split(',').forEach(function(entry) {
            var parts = entry.trim().split(/\\s+/);
            var w = parts[1] ? parseInt(parts[1]) : 0;
            if (w > bestWidth && parts[0]) { bestWidth = w; best = parts[0]; }
          });
          return best;
        }

        var seen = new Set();
        var images = [];
        var video = null;

        // ✅ Primary: read every media item from the gallery
        var mediaItems = document.querySelectorAll('.product-detail-image__image');

        mediaItems.forEach(function(item) {
          // Check if this item is a video
          // .media-video__video is the <video> element itself — its src is a blob.
          // The real URL lives in the <source> child or data attributes.
          var videoContainer =
            item.querySelector('.media-video') ||
            item.querySelector('.media-video__player');

          if (videoContainer) {
            var src = null;

            // 1. <source type="video/mp4"> inside the video element
            var sourceEl = videoContainer.querySelector('source[type="video/mp4"]');
            if (sourceEl) {
              src = sourceEl.getAttribute('src') || sourceEl.getAttribute('data-src');
            }

            // 2. Any <source> inside the video element
            if (!src || src.startsWith('blob:')) {
              var anySource = videoContainer.querySelector('source');
              if (anySource) {
                src = anySource.getAttribute('src') || anySource.getAttribute('data-src');
              }
            }

            // 3. data-src on the <video> element itself
            if (!src || src.startsWith('blob:')) {
              var videoEl = videoContainer.querySelector('video') || videoContainer;
              src = videoEl.getAttribute('data-src') ||
                    videoEl.getAttribute('data-video-src') ||
                    videoEl.getAttribute('data-lazy-src');
            }

            // 4. src on the <video> only if it's not a blob
            if (!src || src.startsWith('blob:')) {
              var videoEl2 = videoContainer.querySelector('video');
              if (videoEl2) {
                var directSrc = videoEl2.getAttribute('src');
                if (directSrc && !directSrc.startsWith('blob:')) src = directSrc;
              }
            }

            if (src && !src.startsWith('blob:') && !video) {
              video = src.split('?')[0];
            }
            return; // Don't also add the poster as an image
          }

          // Otherwise treat as image
          // Try <picture><source> first
          var source = item.querySelector('picture source');
          if (source) {
            var best = pickHighestResFromSrcset(source.getAttribute('srcset') || '');
            if (!best) best = source.getAttribute('src');
            var clean = sanitizeUrl(best);
            if (clean && !seen.has(clean)) { seen.add(clean); images.push(clean); }
            return;
          }

          // Fall back to <img srcset>
          var img = item.querySelector('img');
          if (img) {
            var srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
            var rawUrl = srcset
              ? pickHighestResFromSrcset(srcset)
              : img.getAttribute('data-src') || img.getAttribute('src');
            var clean = sanitizeUrl(rawUrl);
            if (clean && !seen.has(clean)) { seen.add(clean); images.push(clean); }
          }
        });

        // ✅ Fallback: if no .product-detail-image__image found, try the wrapper
        if (images.length === 0) {
          var wrapper = document.querySelector('.product-detail-view__main-image-wrapper');
          if (wrapper) {
            wrapper.querySelectorAll('picture source').forEach(function(source) {
              var best = pickHighestResFromSrcset(source.getAttribute('srcset') || '');
              if (!best) best = source.getAttribute('src');
              var clean = sanitizeUrl(best);
              if (clean && !seen.has(clean)) { seen.add(clean); images.push(clean); }
            });
          }
        }

        // ✅ Last resort: any img on the page with product-looking URLs
        if (images.length === 0) {
          document.querySelectorAll('img').forEach(function(img) {
            var src = img.getAttribute('src') || '';
            if (!src.includes('static.zara') && !src.includes('zara.net')) return;
            var srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
            var rawUrl = srcset ? pickHighestResFromSrcset(srcset) : src;
            var clean = sanitizeUrl(rawUrl);
            if (clean && !seen.has(clean)) { seen.add(clean); images.push(clean); }
          });
        }

        return { images: images, video: video };
      })()
    `)) as { images: string[]; video: string | null };

    const rawImages = mediaData.images;
    const cleanVideo = mediaData.video || null;

    // ─── STEP 5: Sizes ────────────────────────────────────────────────────────
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
      `  --> Images: ${rawImages.length}${cleanVideo ? " + video" : ""} | Price: ${finalPrice}${finalOriginalPrice ? ` (was ${finalOriginalPrice})` : ""} | Name: ${rawName}`,
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
