import { Page } from "puppeteer";
import { Product } from "../interface";

// Helper to dismiss common Inditex popups
async function dismissModals(page: Page) {
  try {
    await page.evaluate(() => {
      // 1. Accept Cookies
      const cookieBtn = document.querySelector("#onetrust-accept-btn-handler");
      // @ts-ignore
      if (cookieBtn) cookieBtn.click();

      // 2. Dismiss Location/Geo Modals
      const stayBtn = document.querySelector(
        '[data-qa-action="stay-in-store"]',
      );
      // @ts-ignore
      if (stayBtn) stayBtn.click();

      // 3. Dismiss Newsletter
      const closeNewsletter = document.querySelector(".modal-newsletter-close");
      // @ts-ignore
      if (closeNewsletter) closeNewsletter.click();
    });
    // Wait for animations to finish
    await new Promise((r) => setTimeout(r, 1000));
  } catch (e) {
    // Silent catch, modals might not exist
  }
}

export async function getMassimoCategories(
  page: Page,
  department: string,
): Promise<string[]> {
  console.log(`\n🔍 Crawler: Navigating to Massimo Dutti Homepage...`);

  const baseUrl = "https://www.massimodutti.com/tr/en/";

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await dismissModals(page);

    console.log(`  --> Opening Mega Menu...`);
    await page.evaluate(() => {
      const menuBtn = document.querySelector("#header-menu-ham");
      // @ts-ignore
      if (menuBtn) menuBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));

    console.log(
      `  --> Crawler: Switching to ${department} tab using HTML IDs...`,
    );

    const targetId = department === "MAN" ? "#MEN" : "#WOMEN";

    await page.evaluate((selector) => {
      const tabBtn = document.querySelector(selector);
      // @ts-ignore
      if (tabBtn) tabBtn.click();
    }, targetId);

    await new Promise((r) => setTimeout(r, 2000));

    let categoryLinks = await page.$$eval("a", (elements) => {
      // @ts-ignore
      return elements.map((el) => el.href).filter(Boolean);
    });

    const deptPath = department === "MAN" ? "/men/" : "/women/";

    categoryLinks = categoryLinks.filter((link) => {
      const isCorrectDept =
        link.includes(deptPath) ||
        link.includes(department === "MAN" ? "/erkek/" : "/kadin/");
      const isNotShoesOrAccessories =
        !link.includes("ayakkabi") &&
        !link.includes("aksesuar") &&
        !link.includes("shoes") &&
        !link.includes("accessories");
      return isCorrectDept && isNotShoesOrAccessories;
    });

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
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 200;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (
            totalHeight >= scrollHeight - window.innerHeight ||
            totalHeight > 6000
          ) {
            clearInterval(timer);
            resolve(undefined);
          }
        }, 200);
      });
    });

    await new Promise((r) => setTimeout(r, 1000));

    let productLinks = await page.$$eval("a", (anchors) => {
      return (
        anchors
          // @ts-ignore
          .map((a) => a.href)
          .filter((href) => {
            const hasStrictIdFormat = href.match(/-l[a-zA-Z0-9]{8}(\?|$)/);
            const isNotBanner =
              !href.includes("/sbl") && !href.includes("banner=true");
            return hasStrictIdFormat && isNotBanner;
          })
          .map((href) => href.split("?")[0])
      );
    });

    productLinks = [...new Set(productLinks)];
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
      await page.waitForSelector("h1", { timeout: 8000 });
    } catch {
      console.log(`  --> ⚠️ Product H1 didn't load, skipping: ${url}`);
      return null;
    }

    await new Promise((r) => setTimeout(r, 1500));

    try {
      await page.waitForSelector(".formatted-price-detail-handler", {
        timeout: 4000,
      });
    } catch {}

    try {
      await page.waitForSelector('button[role="radio"]', { timeout: 3000 });
    } catch {}

    const rawName = await page
      .$eval(
        "h1.md-product-heading-title-txt",
        (el) => el.textContent?.trim() || "Unknown",
      )
      .catch(() => "Unknown");
    const rawPrice = await page
      .$eval(
        ".formatted-price-detail-handler",
        (el) => el.textContent?.trim() || "0",
      )
      .catch(() => "0");

    // --- DEEP SCROLL (For Lazy-Loaded Images) ---
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300; // 👈 Scroll smaller amounts...
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;

          // 👈 Increase max limit to 8000px so it reaches the bottom of long pages!
          if (
            totalHeight >= document.body.scrollHeight - window.innerHeight ||
            totalHeight > 8000
          ) {
            clearInterval(timer);
            resolve(undefined);
          }
        }, 300); // 👈 Wait 300ms between scrolls to let images download (was 150)
      });
    });

    // 👇 NEW: Video Extractor 👇
    const cleanVideo = await page
      .evaluate(() => {
        // Look for a video tag, specifically one with an mp4 source
        const videoSource =
          document.querySelector('video source[type="video/mp4"]') ||
          document.querySelector("video");
        if (!videoSource) return null;

        const src = videoSource.getAttribute("src");
        // Ignore placeholder blobs
        if (src && !src.startsWith("blob:")) {
          return src;
        }
        return null;
      })
      .catch(() => null);

    await page
      .waitForNetworkIdle({ idleTime: 1500, timeout: 10_000 })
      .catch(() => {});

    const rawImages = (await page.evaluate(`
      (() => {
        // 👇 NEW: The Image Upscaler & Sanitizer
        const sanitizeAndUpscale = (url) => {
          if (!url) return null;
          
          // 1. Filter out the trash (Base64 data, SVGs, and known placeholders)
          if (url.startsWith('data:')) return null;
          if (url.endsWith('.svg') || url.includes('placeholder')) return null;

          // 2. The Hack: Find Inditex width params (like /w/250/) and force them to /w/1024/
          return url.replace(/\\/w\\/\\d+\\//g, '/w/1024/');
        };

        const pickHighestRes = (srcset) => {
          if (!srcset) return null;
          const candidates = srcset.split(',').map(entry => {
            const parts = entry.trim().split(/\\s+/);
            return { url: parts[0], width: parts[1] ? parseInt(parts[1]) : 0 };
          });
          candidates.sort((a, b) => b.width - a.width);
          return candidates[0]?.url ?? null;
        };

        const gallery =
          document.querySelector('[class*="product-detail-images"]') ||
          document.querySelector('[class*="pdp-gallery"]') ||
          document.querySelector('[class*="media-gallery"]') ||
          document.querySelector('main');

        if (!gallery) return [];

        const clone = gallery.cloneNode(true);
        ['[class*="complete-the-look"]', '[class*="cross-sell"]',
         '[class*="recommendations"]', '[class*="carousel"]', 'footer']
          .forEach(sel => clone.querySelectorAll(sel).forEach(el => el.remove()));

        const images = [];

        clone.querySelectorAll('picture').forEach(picture => {
          const source = picture.querySelector('source');
          if (!source) return;
          
          // Try to get the highest res from srcset first, fallback to src
          let rawUrl = pickHighestRes(source.getAttribute('srcset') || '') 
                       || source.getAttribute('src');
          
          const cleanUrl = sanitizeAndUpscale(rawUrl);
          if (cleanUrl) images.push(cleanUrl);
        });

        // Fallback for standard <img> tags
        if (images.length === 0) {
          clone.querySelectorAll('img').forEach(img => {
            let rawUrl = img.getAttribute('data-src') || img.getAttribute('src');
            const cleanUrl = sanitizeAndUpscale(rawUrl);
            if (cleanUrl) images.push(cleanUrl);
          });
        }

        return [...new Set(images)];
      })()
    `)) as string[];

    const rawDescription = await page
      .$eval(".md-pdp5-box--info p", (el) => el.textContent?.trim() || "")
      .catch(() => "");
    const cleanColor = await page
      .$eval(
        ".md-color-selector-title-color",
        (el) => el.textContent?.trim() || "",
      )
      .catch(() => "");

    try {
      await page.evaluate(() => {
        const addBtn = document.querySelector("pdp-add-to-cart-button button");
        if (addBtn) {
          // @ts-ignore
          addBtn.click();
        } else {
          const buttons = Array.from(document.querySelectorAll("button"));
          const textBtn = buttons.find((b) => {
            const text = b.textContent?.toUpperCase() || "";
            return text.includes("SEPETE EKLE") || text.includes("ADD TO CART");
          });
          if (textBtn) textBtn.click();
        }
      });

      await new Promise((r) => setTimeout(r, 1000));
      await page.waitForSelector('button[role="option"]', { timeout: 3000 });
    } catch (e) {}

    // 👇 UPGRADED: In-Stock Size Extractor 👇
    const sizes = await page.evaluate(() => {
      const sizeSpans = Array.from(
        document.querySelectorAll(".md-size-selector-btn-title"),
      );

      return sizeSpans
        .filter((span) => {
          // Find the actual clickable button that wraps this text
          const parentBtn = span.closest("button") || span.parentElement;
          if (!parentBtn) return true; // Safety fallback

          // Check if the button is legally disabled or has a 'sold out' class
          const isDisabled =
            parentBtn.hasAttribute("disabled") ||
            parentBtn.className.includes("disabled") ||
            parentBtn.className.includes("out-of-stock");

          // Only keep it if it is NOT disabled
          return !isDisabled;
        })
        .map(
          (span) =>
            span.textContent?.replace(/\n/g, " ").replace(/\s+/g, " ").trim() ||
            "",
        )
        .filter(Boolean);
    });

    let cleanComposition = "Unknown";
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const fabricBtn = buttons.find((b) => {
          const text = b.textContent?.toUpperCase() || "";
          return (
            text.includes("KUMAŞ") ||
            text.includes("MALZEME") ||
            text.includes("BAKIM") ||
            text.includes("İÇERİK") ||
            text.includes("COMPOSITION") ||
            text.includes("MATERIALS") ||
            text.includes("CARE")
          );
        });
        if (fabricBtn) fabricBtn.click();
      });

      await new Promise((r) => setTimeout(r, 1500));

      cleanComposition = await page.$$eval(
        ".ma-product-compo-zone-list span",
        (elements) => {
          return elements
            .map((el) => el.textContent?.trim() || "")
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        },
      );
    } catch (err) {}

    let cleanPrice = rawPrice.replace(/TL/gi, "").trim();
    cleanPrice = cleanPrice.replace(/\./g, "");
    cleanPrice = cleanPrice.replace(/,/g, ".");
    const finalPrice = parseFloat(cleanPrice) || 0;

    console.log(
      `  --> Images found: ${rawImages.length}, Price: ${finalPrice}, Name: ${rawName}`,
    );

    return {
      id: productId,
      name: rawName,
      price: finalPrice,
      currency: "TRY",
      brand: "Massimo Dutti",
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
    console.error(`  --> ❌ Massimo Dutti Scraper crashed on ${url}:`);
    console.error(error.message);
    return null;
  }
}
