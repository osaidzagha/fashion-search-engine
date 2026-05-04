import { Page } from "puppeteer";
import { Product } from "../interface";

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
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
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
            
            // 1. Must be in the right department
            var isCorrectDept = href.includes('${deptPath}') || href.includes('${deptAlt}');
            
            // 👇 THE FIX: Removed the accessory blocking!
            // We keep 'total-look' and '/product-l' out because those aren't category grids.
            var isNotProductOrLook = !href.includes('total-look') && !href.includes('/product-l');
            
            return isCorrectDept && isNotProductOrLook;
          });
      })()
    `)) as string[];

    const cleanLinks = [...new Set(categoryLinks)];
    console.log(`  --> 🕵️‍♂️ Found ${cleanLinks.length} dynamic categories.`);
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
    // 👇 FIX 1: Reverted to domcontentloaded to escape the NetworkIdle Trap!
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Give the heavy React page a few seconds to hydrate
    await new Promise((r) => setTimeout(r, 4000));

    let productLinks: string[] = [];
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`  --> 🔄 Attempt ${attempt} to extract links...`);

      console.log("  --> 📜 Auto-scrolling to trigger lazy load...");
      await page.evaluate(`
        (function() {
          return new Promise(function(resolve) {
            var totalHeight = 0;
            var distance = 600; 
            var scrolls = 0;
            var maxScrolls = 30; // Deep scrape
            
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

      await new Promise((r) => setTimeout(r, 2000));

      productLinks = (await page.evaluate(`
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

      if (productLinks.length > 0) {
        console.log(
          `  --> ✅ Success! Found ${productLinks.length} product links.`,
        );
        break;
      }

      console.log(
        `  --> ⚠️ Found 0 links on attempt ${attempt}. Waiting before retry...`,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 3000));
    }

    if (productLinks.length === 0) {
      console.log(
        `  --> ❌ Failed to find any links after ${maxRetries} attempts.`,
      );
    }

    return productLinks;
  } catch (error: any) {
    // 👇 FIX 2: Better error logging so we don't guess if it crashes
    console.log(
      `  --> ⚠️ Error finding links on this Massimo page: ${error.message}`,
    );
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

  let interceptedVideos: string[] = [];

  const cleanUrl = url.split("?")[0];
  const match = cleanUrl.match(/-l([a-zA-Z0-9]{8})$/);

  if (!match) {
    console.log(`  --> ⚠️ URL format unexpected, skipping: ${url}`);
    return null;
  }

  const rawId = match[1]; // e.g., '06695508'
  const productId = `md_${rawId}`;

  // Create variations of the ID for strict matching
  const noZeroId = rawId.replace(/^0+/, ""); // '6695508'
  const baseId = rawId.substring(0, 4); // '0669'

  // ─── 1. THE STRICT WIRETAP (Network Interception) ─────────────────────────
  const responseHandler = async (response: any) => {
    const reqUrl = response.url();

    if (reqUrl.includes("itxrest") && reqUrl.includes(rawId)) {
      try {
        const json = await response.json();
        let foundVideos: string[] = [];

        const extractMp4s = (obj: any, depth = 0) => {
          if (depth > 12) return;

          if (typeof obj === "string" && obj.includes(".mp4")) {
            const lowerStr = obj.toLowerCase();
            // Block campaigns and editorial videos explicitly
            if (
              !lowerStr.includes("campaign") &&
              !lowerStr.includes("banner") &&
              !lowerStr.includes("promo") &&
              !lowerStr.includes("editorial")
            ) {
              foundVideos.push(obj);
            }
            return;
          }

          if (typeof obj === "object" && obj !== null) {
            for (const key of Object.keys(obj)) {
              const lowerKey = key.toLowerCase();

              // THE IRON CURTAIN: Block cross-sells and "Total Looks"
              if (
                lowerKey.includes("related") ||
                lowerKey.includes("cross") ||
                lowerKey.includes("similar") ||
                lowerKey.includes("bundle") ||
                lowerKey.includes("relacionados") ||
                lowerKey.includes("completar") ||
                lowerKey.includes("outfit") ||
                lowerKey.includes("totallook") ||
                lowerKey.includes("recommend")
              ) {
                continue;
              }
              extractMp4s(obj[key], depth + 1);
            }
          }
        };

        extractMp4s(json);

        if (foundVideos.length > 0) {
          // 👇 STRICT ENFORCEMENT: Only keep videos with matching IDs.
          // We completely removed the `if (validVideos.length === 0)` fallback!
          let validVideos = foundVideos.filter(
            (v) =>
              v.includes(rawId) || v.includes(noZeroId) || v.includes(baseId),
          );

          validVideos.forEach((v) => {
            const finalUrl = v.startsWith("http")
              ? v
              : `https://static.massimodutti.net/3/photos${v}`;
            if (!interceptedVideos.includes(finalUrl))
              interceptedVideos.push(finalUrl);
          });

          if (validVideos.length > 0) {
            console.log(
              `   --> 🎯 WIRETAP SUCCESS: Intercepted ${validVideos.length} valid product video(s)!`,
            );
          }
        }
      } catch (e) {
        // Silently ignore parsing errors
      }
    }
  };

  page.on("response", responseHandler);

  try {
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

    // ─── STEP 1: Text Hydration ───────────────────────────────────────────
    await page.evaluate(`
      (function() {
        return new Promise(function(resolve) {
          var maxWait = 8000;
          var waited = 0;
          var interval = setInterval(function() {
            var descEl  = document.querySelector('.md-pdp5-box--info-short, .md-pdp5-box--info');
            var colorEl = document.querySelector('.md-color-selector-title-color');
            var priceEl = document.querySelector('.formatted-price-detail-handler, [aria-label*="Discounted price"], [aria-label*="\\u0130ndirimli fiyat"]');
            
            var descReady  = descEl  && descEl.textContent  && descEl.textContent.trim().length > 0;
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

    // ─── STEP 2: Read Text Data ───────────────────────────────────────────
    const textData = (await page.evaluate(`
      (function() {
        function getText(selector) {
          var el = document.querySelector(selector);
          return el && el.textContent ? el.textContent.replace(/\\s+/g, ' ').trim() : '';
        }

        function getMDPrice(selector) {
          var el = document.querySelector(selector);
          if (!el) return '';
          var aria = el.getAttribute('aria-label');
          if (aria && /[0-9]/.test(aria)) return aria; 
          return el.textContent ? el.textContent.trim() : '';
        }

        var originalRaw = getMDPrice('[aria-label*="Market Price"]') || getMDPrice('[aria-label*="Original"]') || getMDPrice('.is-through');
        var currentRaw = getMDPrice('[aria-label*="Discounted price"]') || getMDPrice('.d-price-special') || getMDPrice('.price') || getMDPrice('.product-price');

        if (!originalRaw || !currentRaw) {
           var oldPriceEl = document.querySelector('.is-through');
           var newPriceEl = document.querySelector('.d-price-special');
           if (oldPriceEl && newPriceEl) {
               originalRaw = originalRaw || oldPriceEl.textContent.trim();
               currentRaw = currentRaw || newPriceEl.textContent.trim();
           }
        }

        return {
          name: getText('h1.md-product-heading-title-txt') || getText('h1'),
          description: getText('.md-pdp5-box--info-short') || getText('.md-pdp5-box--info p') || getText('.md-pdp5-box--info'),
          color: getText('.md-color-selector-title-color') || getText('.md-color-selector-title-label') || getText('.md-color-selector-title'),
          currentRaw: currentRaw,
          originalRaw: originalRaw,
        };
      })()
    `)) as any;

    // ─── STEP 3: Deep Scroll ──────────────────────────────────────────────
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

    // ─── STEP 4: Images & GHOST FRAME DEFENSE ─────────────────────────────
    const rawImages = (await page.evaluate(`
      (function() {
        function sanitizeUrl(url) {
          if (!url) return null;
          var lowerUrl = url.toLowerCase();
          if (lowerUrl.startsWith('data:') || lowerUrl.endsWith('.svg') || lowerUrl.includes('placeholder')) return null;
          if (lowerUrl.includes('swatch') || lowerUrl.includes('texture') || lowerUrl.includes('icon')) return null;
          var clean = url.split('?')[0];
          if (!clean || clean.length < 10) return null;
          return clean;
        }

        function pickHighestResFromSrcset(srcset) {
          if (!srcset) return null;
          var best = null;
          var bestWidth = -1;
          srcset.split(',').forEach(function(entry) {
            var parts = entry.trim().split(/\\s+/);
            var u = parts[0];
            var w = parts[1] ? parseInt(parts[1]) : 0;
            if (w > bestWidth && u) { bestWidth = w; best = u; }
          });
          return best;
        }

        var gallery = document.querySelector('main') || document.body;
        var clone = gallery.cloneNode(true);

        var badPosters = [];
        clone.querySelectorAll('video').forEach(function(v) {
          var posterUrl = v.getAttribute('poster');
          if (posterUrl) badPosters.push(sanitizeUrl(posterUrl));
          v.remove(); 
        });

        ['[class*="complete-the-look"]','[class*="cross-sell"]',
         '[class*="recommendations"]','[class*="carousel"]','footer',
         '[class*="color-selector"]', '[class*="swatch"]', '[class*="thumb"]']
          .forEach(function(sel) {
            clone.querySelectorAll(sel).forEach(function(el) { el.remove(); });
          });

        var seen = new Set();
        var images = [];

        function addUrl(rawUrl) {
          var clean = sanitizeUrl(rawUrl);
          if (clean && !seen.has(clean) && badPosters.indexOf(clean) === -1) { 
            seen.add(clean); 
            images.push(clean); 
          }
        }

        clone.querySelectorAll('picture').forEach(function(picture) {
          var sources = Array.from(picture.querySelectorAll('source'));
          if (sources.length === 0) return;
          var best = null;
          var bestWidth = -1;
          sources.forEach(function(source) {
            var srcset = source.getAttribute('srcset') || '';
            srcset.split(',').forEach(function(entry) {
              var parts = entry.trim().split(/\\s+/);
              var w = parts[1] ? parseInt(parts[1]) : 0;
              if (w > bestWidth && parts[0]) { bestWidth = w; best = parts[0]; }
            });
            if (best === null) { var src = source.getAttribute('src'); if (src) best = src; }
          });
          addUrl(best);
        });

        if (images.length === 0) {
          clone.querySelectorAll('img').forEach(function(img) {
            var srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
            var rawUrl = srcset ? pickHighestResFromSrcset(srcset) : img.getAttribute('data-src') || img.getAttribute('src');
            addUrl(rawUrl);
          });
        }

        return images;
      })()
    `)) as string[];

    // ─── STEP 5: DOM Videos (STRICT ID FALLBACK) ────────────────────────────
    const domVideos = (await page.evaluate(
      (id1, id2, id3) => {
        var videos = Array.from(document.querySelectorAll("video"));
        var validVideos = [];

        for (var i = 0; i < videos.length; i++) {
          var v = videos[i];

          if (
            v.closest(
              'footer, [class*="recommendations"], [class*="cross-sell"], [class*="complete-the-look"]',
            )
          ) {
            continue;
          }

          var src = v.getAttribute("src") || v.getAttribute("data-src");
          if (!src) {
            var source = v.querySelector('source[type="video/mp4"], source');
            if (source) {
              src =
                source.getAttribute("src") || source.getAttribute("data-src");
            }
          }

          if (src && !src.startsWith("blob:")) {
            var lowerSrc = src.toLowerCase();
            // 👇 STRICT ID CHECK: Even DOM videos must match the product ID!
            var hasId =
              lowerSrc.includes(id1.toLowerCase()) ||
              lowerSrc.includes(id2.toLowerCase()) ||
              lowerSrc.includes(id3.toLowerCase());

            if (
              hasId &&
              !lowerSrc.includes("campaign") &&
              !lowerSrc.includes("banner") &&
              !lowerSrc.includes("promo") &&
              !lowerSrc.includes("editorial")
            ) {
              if (validVideos.indexOf(src) === -1) {
                validVideos.push(src);
              }
            }
          }
        }
        return validVideos;
      },
      rawId,
      noZeroId,
      baseId,
    )) as string[];

    // ─── STEP 6: Sizes & Composition ──────────────────────────────────────
    try {
      await page.evaluate(`
        (function() {
          var addBtn = document.querySelector('pdp-add-to-cart-button button');
          if (addBtn) { addBtn.click(); } 
          else {
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
    } catch (e) {}

    const sizes = (await page.evaluate(`
      (function() {
        return Array.from(document.querySelectorAll('.md-size-selector-btn-title'))
          .filter(function(span) {
            var parentBtn = span.closest('button') || span.parentElement;
            if (!parentBtn) return true;
            return !(parentBtn.hasAttribute('disabled') || parentBtn.className.includes('disabled') || parentBtn.className.includes('out-of-stock'));
          })
          .map(function(span) { return span.textContent ? span.textContent.replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim() : ''; })
          .filter(Boolean);
      })()
    `)) as string[];

    let cleanComposition = "";
    try {
      await page.evaluate(`
        (function() {
          var byClass = document.querySelector('button.btn.md-list-action.label-m.ttu.w-100');
          if (byClass) byClass.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 1000));
      cleanComposition = (await page.evaluate(`
        (function() {
          return Array.from(document.querySelectorAll('.ma-product-compo-zone-list span'))
            .map(function(el) { return el.textContent ? el.textContent.trim() : ''; })
            .filter(Boolean).join(' ').replace(/\\s+/g, ' ').trim();
        })()
      `)) as string;
    } catch (err) {}

    // ─── Assemble ─────────────────────────────────────────────────────────────
    page.off("response", responseHandler);

    const rawName = textData.name;
    const rawDescription = textData.description;
    const cleanColor = textData.color.split("|")[0].trim();
    const finalPrice = parseUniversalPrice(textData.currentRaw) ?? 0;

    if (finalPrice <= 0) return null;

    const finalOriginalPrice = textData.originalRaw
      ? parseUniversalPrice(textData.originalRaw)
      : undefined;

    // Merge wiretap and DOM videos, remove duplicates!
    const finalVideos = [...new Set([...interceptedVideos, ...domVideos])];

    console.log(
      `   --> Images: ${rawImages.length} | Videos: ${finalVideos.length} | Price: ${finalPrice} | Name: ${rawName}`,
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
      videos: finalVideos.length > 0 ? finalVideos : undefined,
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
    page.off("response", responseHandler);
    console.error(
      `   --> ❌ Massimo Dutti Scraper crashed on ${url}:`,
      error.message,
    );
    return null;
  } finally {
    page.off("response", responseHandler);
  }
}
