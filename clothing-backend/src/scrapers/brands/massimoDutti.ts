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

    // 1. Deep scroll to load all images
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

    // 2. Scroll back to top so description/color components re-enter viewport and hydrate
    await page.evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await new Promise((r) => setTimeout(r, 1000));

    // 3. Wait for network to settle after scroll
    await page
      .waitForNetworkIdle({ idleTime: 1500, timeout: 10_000 })
      .catch(() => {});

    // 4. Read ALL text fields in one shot — one DOM snapshot!
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
          originalRaw: originalRaw 
        };
      })()
    `)) as {
      name: string;
      description: string;
      color: string;
      currentRaw: string;
      originalRaw: string;
    };

    const rawName = textData.name;
    const rawDescription = textData.description;
    const cleanColor = textData.color.split("|")[0].trim();
    const finalPrice = parseUniversalPrice(textData.currentRaw);
    const finalOriginalPrice = textData.originalRaw
      ? parseUniversalPrice(textData.originalRaw)
      : undefined;

    // 5. Images
    const rawImages = (await page.evaluate(`
      (function() {
        function sanitizeAndUpscale(url) {
          if (!url) return null;
          if (url.startsWith('data:') || url.endsWith('.svg') || url.includes('placeholder')) return null;
          var cleanUrl = url.split('?')[0];
          return cleanUrl.replace(/\\/w\\/\\d+\\//g, '/w/1024/');
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
        var gallery = document.querySelector('main') || document.body;
        var clone = gallery.cloneNode(true);
        ['[class*="complete-the-look"]','[class*="cross-sell"]','[class*="recommendations"]','[class*="carousel"]','footer']
          .forEach(function(sel) { clone.querySelectorAll(sel).forEach(function(el) { el.remove(); }); });
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

    // 6. Video
    const cleanVideo = (await page
      .evaluate(
        `
      (function() {
        var videoSource =
          document.querySelector('video source[type="video/mp4"]') ||
          document.querySelector('video');
        if (!videoSource) return null;
        var src = videoSource.getAttribute('src');
        if (src && !src.startsWith('blob:')) return src;
        return null;
      })()
    `,
      )
      .catch(() => null)) as string | null;

    // 7. Click Add to Cart to reveal sizes
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

    // 8. Extract Sizes
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

    // 9. Click and read Composition
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

    console.log(
      `   --> Images: ${rawImages.length} | Price: ${finalPrice}${finalOriginalPrice ? ` (was ${finalOriginalPrice})` : ""} | Name: ${rawName}`,
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
