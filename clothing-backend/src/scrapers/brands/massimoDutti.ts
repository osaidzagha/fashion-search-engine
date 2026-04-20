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

async function dismissModals(page: Page) {
  await page
    .evaluate(
      `
    (function() {
      var cookieBtn = document.querySelector('#onetrust-accept-btn-handler');
      if (cookieBtn) cookieBtn.click();
      var stayBtn = document.querySelector('[data-qa-action="stay-in-store"]');
      if (stayBtn) stayBtn.click();
      var closeNewsletter = document.querySelector('.modal-newsletter-close');
      if (closeNewsletter) closeNewsletter.click();
    })()
  `,
    )
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));
}

export async function getMassimoCategories(
  page: Page,
  department: string,
): Promise<string[]> {
  console.log(`\n🔍 Crawler: Navigating to Massimo Dutti Homepage...`);
  const baseUrl = "https://www.massimodutti.com/tr/en/";

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 90000 });
    await dismissModals(page);

    console.log(`  --> Opening Mega Menu...`);
    await page.evaluate(`
      (function() {
        var menuBtn = document.querySelector('#header-menu-ham');
        if (menuBtn) menuBtn.click();
      })()
    `);

    await new Promise((r) => setTimeout(r, 2000));

    console.log(`  --> Switching to ${department} tab using HTML IDs...`);
    const targetId = department === "MAN" ? "#MEN" : "#WOMEN";

    await page.evaluate(`
      (function() {
        var tabBtn = document.querySelector('${targetId}');
        if (tabBtn) tabBtn.click();
      })()
    `);

    await new Promise((r) => setTimeout(r, 2000));

    const deptPath = department === "MAN" ? "/men/" : "/women/";
    const deptAlt = department === "MAN" ? "/erkek/" : "/kadin/";

    const categoryLinks = (await page.evaluate(`
      (function() {
        return Array.from(document.querySelectorAll('a'))
          .map(function(el) { return el.href; })
          .filter(function(href) {
            if (!href) return false;
            var isCorrectDept = href.includes('${deptPath}') || href.includes('${deptAlt}');
            var isNotAccessory =
              !href.includes('ayakkabi') &&
              !href.includes('aksesuar') &&
              !href.includes('shoes') &&
              !href.includes('accessories');
            return isCorrectDept && isNotAccessory;
          });
      })()
    `)) as string[];

    const cleanLinks = [...new Set(categoryLinks)];
    console.log(
      `  --> 🕵️‍♂️ Found ${cleanLinks.length} dynamic clothing categories.`,
    );
    return cleanLinks;
  } catch (error: any) {
    console.error(
      `  --> ❌ Failed to get dynamic categories for ${department}`,
    );
    console.error(`  --> 🛑 Error details: ${error.message}`);
    return [];
  }
}

export async function getMassimoProductLinks(
  page: Page,
  url: string,
): Promise<string[]> {
  console.log(`📂 Visiting Massimo Dutti category: ${url}`);

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 4000));

    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var totalHeight = 0;
          var distance = 200;
          var timer = setInterval(function() {
            var scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 6000) {
              clearInterval(timer);
              resolve(undefined);
            }
          }, 200);
        });
      })()
    `);

    await new Promise((r) => setTimeout(r, 1000));

    const productLinks = (await page.evaluate(`
      (function() {
        return Array.from(document.querySelectorAll('a'))
          .map(function(a) { return a.href; })
          .filter(function(href) {
            var hasStrictIdFormat = /-l[a-zA-Z0-9]{8}(\\?|$)/.test(href);
            var isNotBanner = !href.includes('/sbl') && !href.includes('banner=true');
            return hasStrictIdFormat && isNotBanner;
          })
          .map(function(href) { return href.split('?')[0]; })
          .filter(function(href, index, self) { return self.indexOf(href) === index; });
      })()
    `)) as string[];

    console.log(`  --> Found ${productLinks.length} real product links.`);
    return productLinks;
  } catch (error) {
    console.log(`  --> ⚠️ Error finding links on this page.`);
    return [];
  }
}

export async function scrapeMassimoProductData(
  page: Page,
  url: string,
  category: string = "",
  department: string = "",
): Promise<Product | null> {
  console.log(`   --> Scraping Massimo Dutti product: ${url}`);
  try {
    const cleanUrl = url.split("?")[0];
    const match = cleanUrl.match(/-l([a-zA-Z0-9]{8})$/);

    if (!match) {
      console.log(`  --> ⚠️ URL format unexpected, skipping: ${url}`);
      return null;
    }
    const productId = `md_${match[1]}`;

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await dismissModals(page);

    try {
      await page.waitForSelector("h1.md-product-heading-title-txt", {
        timeout: 8000,
      });
    } catch {
      console.log(`  --> ⚠️ Product H1 didn't load, skipping: ${url}`);
      return null;
    }

    await new Promise((r) => setTimeout(r, 1500));

    // ─── STEP 1: Poll for text hydration while page is at top ─────────────────
    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var maxWait = 8000;
          var waited = 0;
          var interval = setInterval(function() {
            var descEl  = document.querySelector('.md-pdp5-box--info-short, .md-pdp5-box--info');
            var colorEl = document.querySelector('.md-color-selector-title-color');
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

    // ─── STEP 2: Read ALL text + price while page is at top ───────────────────
    const textData = (await page.evaluate(`
      (function() {
        function getText(selector) {
          var el = document.querySelector(selector);
          return el && el.textContent ? el.textContent.replace(/\\s+/g, ' ').trim() : '';
        }
        function extractFromAriaLabel(el) {
          if (!el) return '';
          var label = el.getAttribute('aria-label') || '';
          var m = label.match(/[\\d][0-9.,]*/);
          return m ? m[0] : '';
        }

        var name = getText('h1.md-product-heading-title-txt') || getText('h1');

        var description =
          getText('.md-pdp5-box--info-short') ||
          getText('.md-pdp5-box--info p') ||
          getText('.md-pdp5-box--info');

        var color =
          getText('.md-color-selector-title-color') ||
          getText('.md-color-selector-title-label') ||
          getText('.md-color-selector-title');

        var discountedEl = document.querySelector('[aria-label*="Discounted price"], [aria-label*="\\u0130ndirimli fiyat"]');
        var originalEl   = document.querySelector('[aria-label*="Original price"], [aria-label*="Orijinal fiyat"], .is-through[aria-label]');
        var fallbackEl   = document.querySelector('.formatted-price-detail-handler');

        var currentRaw = discountedEl
          ? extractFromAriaLabel(discountedEl)
          : (fallbackEl && fallbackEl.textContent ? fallbackEl.textContent.trim() : '');
        var originalRaw = originalEl ? extractFromAriaLabel(originalEl) : '';

        return {
          name: name,
          description: description,
          color: color,
          currentRaw: currentRaw,
          originalRaw: originalRaw,
        };
      })()
    `)) as {
      name: string;
      description: string;
      color: string;
      currentRaw: string;
      originalRaw: string;
    };

    // ─── STEP 3: Slow scroll to hydrate all .product-media__img items ─────────
    // Massimo lazy-loads each image card as it enters the viewport.
    // 200px steps at 250ms gives each card time to render before we move on.
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

    await page
      .waitForNetworkIdle({ idleTime: 2000, timeout: 12_000 })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 500));

    // ─── STEP 4: Extract images from .product-media__img img ─────────────────
    // Massimo structure: .product-media__img > .media-image > img[srcset]
    // Each button wraps exactly one image. srcset has 400w/850w/1024w/1440w/1920w/2400w/4000w.
    // We pick the highest-res entry from srcset and strip the query string.
    const mediaData = (await page.evaluate(`
      (function() {
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

        function sanitizeUrl(url) {
          if (!url) return null;
          if (url.startsWith('data:') || url.endsWith('.svg') || url.includes('placeholder')) return null;
          // Strip query string — CDN serves original at full res without params
          return url.split('?')[0];
        }

        var seen = new Set();
        var images = [];
        var video = null;

        // ✅ PRIMARY: each .product-media__img wraps exactly one product image
        var mediaItems = document.querySelectorAll('.product-media__img');

        mediaItems.forEach(function(item) {
          // Check for video first — same multi-method approach as Zara
          var videoContainer =
            item.querySelector('.media-video') ||
            item.querySelector('.media-video__player') ||
            item.querySelector('video');

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

            // 3. data-src on the video element itself
            if (!src || src.startsWith('blob:')) {
              var videoEl = videoContainer.querySelector('video') || videoContainer;
              src = videoEl.getAttribute('data-src') ||
                    videoEl.getAttribute('data-video-src') ||
                    videoEl.getAttribute('data-lazy-src');
            }

            // 4. Direct src only if not a blob
            if (!src || src.startsWith('blob:')) {
              var videoEl2 = videoContainer.querySelector
                ? videoContainer.querySelector('video')
                : videoContainer;
              if (videoEl2) {
                var directSrc = videoEl2.getAttribute('src');
                if (directSrc && !directSrc.startsWith('blob:')) src = directSrc;
              }
            }

            if (src && !src.startsWith('blob:') && !video) {
              video = src.split('?')[0];
            }
            return;
          }

          // Image: read srcset from the img tag and pick highest res
          var img = item.querySelector('img');
          if (!img) return;

          var srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
          var rawUrl = srcset
            ? pickHighestResFromSrcset(srcset)
            : img.getAttribute('data-src') || img.getAttribute('src');

          var clean = sanitizeUrl(rawUrl);
          if (clean && !seen.has(clean)) {
            seen.add(clean);
            images.push(clean);
          }
        });

        // ✅ FALLBACK: if .product-media__img returns nothing, try any img
        //    with massimodutti CDN URLs (avoids picking up icons/logos)
        if (images.length === 0) {
          document.querySelectorAll('img').forEach(function(img) {
            var src = img.getAttribute('src') || '';
            if (!src.includes('massimodutti') && !src.includes('static.massimo')) return;
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
          var addBtn = document.querySelector('pdp-add-to-cart-button button');
          if (addBtn) {
            addBtn.click();
          } else {
            var buttons = Array.from(document.querySelectorAll('button'));
            var textBtn = buttons.find(function(b) {
              var text = b.textContent ? b.textContent.toUpperCase() : '';
              return text.includes('SEPETE EKLE') || text.includes('ADD TO CART');
            });
            if (textBtn) textBtn.click();
          }
        })()
      `);
      await new Promise((r) => setTimeout(r, 1000));
      await page.waitForSelector('button[role="option"]', { timeout: 3000 });
    } catch (e) {}

    const sizes = (await page.evaluate(`
      (function() {
        return Array.from(document.querySelectorAll('.md-size-selector-btn-title'))
          .filter(function(span) {
            var parentBtn = span.closest('button') || span.parentElement;
            if (!parentBtn) return true;
            return !(
              parentBtn.hasAttribute('disabled') ||
              parentBtn.className.includes('disabled') ||
              parentBtn.className.includes('out-of-stock')
            );
          })
          .map(function(span) {
            return span.textContent ? span.textContent.replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim() : '';
          })
          .filter(Boolean);
      })()
    `)) as string[];

    // ─── STEP 6: Composition ──────────────────────────────────────────────────
    let cleanComposition = "";
    try {
      await page.evaluate(`
        (function() {
          var byClass = document.querySelector('button.btn.md-list-action.label-m.ttu.w-100');
          if (byClass) {
            byClass.click();
          } else {
            var buttons = Array.from(document.querySelectorAll('button'));
            var fabricBtn = buttons.find(function(b) {
              var text = b.textContent ? b.textContent.toUpperCase() : '';
              return (
                text.includes('KUMA\\u015e') ||
                text.includes('MALZEME') ||
                text.includes('BAKIM') ||
                text.includes('\\u0130\\u00c7ER\\u0130K') ||
                text.includes('COMPOSITION') ||
                text.includes('MATERIALS') ||
                text.includes('CARE')
              );
            });
            if (fabricBtn) fabricBtn.click();
          }
        })()
      `);
      await new Promise((r) => setTimeout(r, 1500));

      cleanComposition = (await page.evaluate(`
        (function() {
          return Array.from(document.querySelectorAll('.ma-product-compo-zone-list span'))
            .map(function(el) { return el.textContent ? el.textContent.trim() : ''; })
            .filter(Boolean)
            .join(' ')
            .replace(/\\s+/g, ' ')
            .trim();
        })()
      `)) as string;
    } catch (err) {}

    // ─── Assemble ─────────────────────────────────────────────────────────────
    const rawName = textData.name;
    const rawDescription = textData.description;
    const cleanColor = textData.color.split("|")[0].trim();
    const finalPrice = parseUniversalPrice(textData.currentRaw);
    const finalOriginalPrice = textData.originalRaw
      ? parseUniversalPrice(textData.originalRaw)
      : undefined;

    console.log(
      `   --> Images: ${rawImages.length}${cleanVideo ? " + video" : ""} | Price: ${finalPrice}${finalOriginalPrice ? ` (was ${finalOriginalPrice})` : ""} | Name: ${rawName}`,
    );

    return {
      id: productId,
      name: rawName,
      price: finalPrice,
      ...(finalOriginalPrice !== undefined && {
        originalPrice: finalOriginalPrice,
      }),
      currency: "TRY",
      brand: "Massimo Dutti",
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
    console.error(`   --> ❌ Massimo Dutti Scraper crashed on ${url}:`);
    console.error(error.message);
    return null;
  }
}
