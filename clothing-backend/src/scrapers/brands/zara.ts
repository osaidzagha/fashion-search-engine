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
  console.log("   -->Checking for Geo-Location Modal...");
  try {
    const stayButtonSelector = '[data-qa-action="stay-in-store"]';
    await page.waitForSelector(stayButtonSelector, { timeout: 3000 });
    console.log("   --> Modal Detected! Clicking 'Stay in Turkey'...");
    await page.click(stayButtonSelector);
    await new Promise((r) => setTimeout(r, 1000));
    console.log("   -->Modal Dismissed.");
  } catch (e) {
    console.log("   -->No modal found (Safe to proceed).");
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
    await new Promise((r) => setTimeout(r, 1500));

    const rawDescription = await page
      .$eval(
        ".product-detail-description",
        (el) => el.textContent?.trim() || "",
      )
      .catch(() => "");

    const rawColor = await page
      .$eval(
        ".product-color-extended-name",
        (el) => el.textContent?.trim() || "",
      )
      .catch(() => "");

    const rawComposition = await page
      .$eval(
        ".product-detail-composition",
        (el) => el.textContent?.trim() || "",
      )
      .catch(() => "");

    const rawName = await page
      .$eval("h1", (el) => el.textContent?.trim() || "Unknown")
      .catch(() => "Unknown");

    const rawPrice = await page.evaluate(() => {
      const priceElement = document.querySelector(
        ".money-amount__main, .price__amount-current, .price__amount",
      );
      return priceElement ? priceElement.textContent?.trim() || "0" : "0";
    });

    // --- SCROLL ---
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 400;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (
            totalHeight >= document.body.scrollHeight - window.innerHeight ||
            totalHeight > 3000
          ) {
            clearInterval(timer);
            resolve(undefined);
          }
        }, 150);
      });
    });

    await page
      .waitForNetworkIdle({ idleTime: 1500, timeout: 10_000 })
      .catch(() => {});

    const rawImages = (await page.evaluate(`
  (() => {
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

    // ONE image per <picture> element — avoids breakpoint duplicates
    clone.querySelectorAll('picture').forEach(picture => {
      const source = picture.querySelector('source');
      if (!source) return;
      const url = pickHighestRes(source.getAttribute('srcset') || '');
      if (url && !url.startsWith('data:') && !url.includes('placeholder')) {
        images.push(url);
      }
    });

    if (images.length === 0) {
      clone.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('data-src') || img.getAttribute('src') || '';
        if (src && !src.startsWith('data:') && !src.includes('placeholder')) {
          images.push(src);
        }
      });
    }

    return [...new Set(images)];
  })()
`)) as string[];

    let cleanColor = rawColor.split("|")[0].trim();
    const finalPrice = parseUniversalPrice(rawPrice);
    const cleanComposition = rawComposition.replace("Composition: ", "").trim();

    try {
      await page.evaluate(() => {
        const addBtn = document.querySelector(
          'button[data-qa-action="add-to-cart"]',
        );
        // @ts-ignore
        if (addBtn) addBtn.click();
      });
      await new Promise((r) => setTimeout(r, 1000));
      await page.waitForSelector(".size-selector-sizes-size__label", {
        timeout: 3000,
      });
    } catch (e) {}

    const sizes = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll(".size-selector-sizes-size__label"),
      );
      return elements.map((el) => el.textContent?.trim() || "").filter(Boolean);
    });

    console.log(
      `  --> Images found: ${rawImages.length}, Price: ${finalPrice}, Name: ${rawName}`,
    );

    return {
      id: productId,
      name: rawName,
      price: finalPrice,
      currency: "TRY",
      brand: "Zara",
      // @ts-ignore
      images: rawImages,
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
    const links = await page.$$eval(".product-link", (elements) => {
      return (
        elements
          // @ts-ignore
          .map((el) => el.href)
          .filter((href) => href !== "")
      );
    });
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

    const links = await page.$$eval(
      linkSelector,
      (elements, dept) => {
        return (
          elements
            // @ts-ignore
            .map((el) => el.href)
            .filter((href) => href && href.includes(`/${dept.toLowerCase()}-`))
        );
      },
      department,
    );

    const uniqueLinks = [...new Set(links)];
    console.log(`   --> 🕵️‍♂️ Found ${uniqueLinks.length} categories.`);
    return uniqueLinks;
  } catch (error: any) {
    console.error(`  --> ❌ Category crawler failed: ${error.message}`);
    return [];
  }
}
