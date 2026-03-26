import { Page } from "puppeteer";
import { Product } from "../interface";

// Helper to dismiss common Inditex popups
async function dismissModals(page: Page) {
  try {
    await page.evaluate(() => {
      // 1. Accept Cookies
      const cookieBtn = document.querySelector("#onetrust-accept-btn-handler");
      if (cookieBtn) (cookieBtn as HTMLButtonElement).click();

      // 2. Dismiss Location/Geo Modals
      const stayBtn = document.querySelector(
        '[data-qa-action="stay-in-store"]',
      );
      if (stayBtn) (stayBtn as HTMLButtonElement).click();

      // 3. Dismiss Newsletter
      const closeNewsletter = document.querySelector(".modal-newsletter-close");
      if (closeNewsletter) (closeNewsletter as HTMLButtonElement).click();
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
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 20000 });
    await dismissModals(page);

    // Bypassing visual blockers to open the menu
    console.log(`  --> Opening Mega Menu...`);
    await page.evaluate(() => {
      const menuBtn = document.querySelector("#header-menu-ham");
      if (menuBtn) {
        // Force a click via JS
        (menuBtn as HTMLButtonElement).click();
      }
    });

    await new Promise((r) => setTimeout(r, 2000));

    console.log(`  --> Crawler: Switching to ${department} tab...`);
    const deptTextTR = department === "MAN" ? "ERKEK" : "KADIN";
    const deptTextEN = department === "MAN" ? "MEN" : "WOMEN";

    await page.evaluate(
      (tr, en) => {
        const tabs = Array.from(
          document.querySelectorAll(".menu-header span, .menu-header div, a"),
        );
        const targetTab = tabs.find((el) => {
          const text = el.textContent?.trim().toUpperCase();
          return text === tr || text === en;
        });
        if (targetTab) (targetTab as HTMLElement).click();
      },
      deptTextTR,
      deptTextEN,
    );

    await new Promise((r) => setTimeout(r, 2000));

    let categoryLinks = await page.$$eval("a.mn-list-item", (elements) => {
      return elements
        .map((el) => (el as HTMLAnchorElement).href)
        .filter(Boolean);
    });

    const deptPath = department === "MAN" ? "/men/" : "/women/";

    categoryLinks = categoryLinks.filter((link) => {
      const isCorrectDept =
        link.includes(deptPath) ||
        link.includes(department === "MAN" ? "/erkek/" : "/kadin/"); // Keep TR as fallback
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
  } catch (error) {
    console.error(
      `  --> ❌ Failed to get dynamic categories for ${department}`,
    );
    return [];
  }
}

export async function getMassimoProductLinks(
  page: Page,
  url: string,
): Promise<string[]> {
  console.log(`📂 Visiting Massimo Dutti category: ${url}`);

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // Smooth "Human" Scrolling to gracefully trigger lazy-loading
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 200; // Scroll 200px at a time
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          // Stop scrolling when we reach the bottom or a max height
          if (
            totalHeight >= scrollHeight - window.innerHeight ||
            totalHeight > 6000
          ) {
            clearInterval(timer);
            resolve();
          }
        }, 200); // Every 200 milliseconds
      });
    });

    // Let the final images load
    await new Promise((r) => setTimeout(r, 1000));

    let productLinks = await page.$$eval("a", (anchors) => {
      return anchors
        .map((a) => a.href)
        .filter((href) => {
          const hasStrictIdFormat = href.match(/-l[a-zA-Z0-9]{8}(\?|$)/);
          const isNotBanner =
            !href.includes("/sbl") && !href.includes("banner=true");
          return hasStrictIdFormat && isNotBanner;
        })
        .map((href) => href.split("?")[0]);
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

    // 1. HARD WAIT: We MUST have a title.
    try {
      await page.waitForSelector("h1", { timeout: 8000 });
    } catch {
      console.log(`  --> ⚠️ Product H1 didn't load, skipping: ${url}`);
      return null;
    }

    // React Hydration Pause
    await new Promise((r) => setTimeout(r, 1500));

    // 2. SOFT WAITS
    try {
      await page.waitForSelector(".formatted-price-detail-handler", {
        timeout: 4000,
      });
    } catch {}

    try {
      // FIX: Removed the restrictive .btn-selector parent class
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
    const rawImage = await page
      .$eval("div.media-image img", (el) => el.getAttribute("src") || "")
      .catch(() => "");
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
      // 1. Click the specific Add to Cart button based on the custom <pdp-add-to-cart-button> wrapper
      await page.evaluate(() => {
        const addBtn = document.querySelector("pdp-add-to-cart-button button");
        if (addBtn) {
          (addBtn as HTMLButtonElement).click();
        } else {
          // Fallback based on text if the tag changes
          const buttons = Array.from(document.querySelectorAll("button"));
          const textBtn = buttons.find((b) => {
            const text = b.textContent?.toUpperCase() || "";
            return text.includes("SEPETE EKLE") || text.includes("ADD TO CART");
          });
          if (textBtn) textBtn.click();
        }
      });

      // 2. Wait for the UI animation
      await new Promise((r) => setTimeout(r, 1000));

      // 3. Wait for the newly discovered listbox options
      await page.waitForSelector('button[role="option"]', { timeout: 3000 });
    } catch (e) {
      // Silent catch
    }

    // 4. Extract sizes from the exact span class you found: .md-size-selector-btn-title
    const sizes = await page.evaluate(() => {
      const sizeSpans = Array.from(
        document.querySelectorAll(".md-size-selector-btn-title"),
      );
      return sizeSpans
        .map((span) => {
          return (
            span.textContent?.replace(/\n/g, " ").replace(/\s+/g, " ").trim() ||
            ""
          );
        })
        .filter(Boolean);
    });
    let cleanComposition = "Unknown";
    try {
      // FIX: Dynamically find the Turkish composition button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const fabricBtn = buttons.find((b) => {
          const text = b.textContent?.toUpperCase() || "";
          // Matches common Turkish words for Material, Fabric, or Care
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

      // Wait for the side panel to slide open
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

    // Price parsing (Turkish format support)
    let cleanPrice = rawPrice.replace(/TL/gi, "").trim();
    cleanPrice = cleanPrice.replace(/\./g, "");
    cleanPrice = cleanPrice.replace(/,/g, ".");
    const finalPrice = parseFloat(cleanPrice) || 0;

    return {
      id: productId,
      name: rawName,
      price: finalPrice,
      currency: "TRY",
      brand: "Massimo Dutti",
      imageUrl: rawImage,
      link: url,
      timestamp: new Date(),
      color: cleanColor,
      description: rawDescription,
      composition: cleanComposition,
      sizes: sizes,
      category: category,
    };
  } catch (error) {
    return null;
  }
}
