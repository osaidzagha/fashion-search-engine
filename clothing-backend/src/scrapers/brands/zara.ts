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
    // 1. Wait for the element to appear in the DOM
    const targetElement = await page.waitForSelector(xpath, { timeout: 5000 });

    // 2. FORCE CLICK using browser JavaScript (bypasses animations/overlays)
    if (targetElement) {
      await page.evaluate((el) => {
        (el as HTMLElement).click();
      }, targetElement);
    }

    // 3. Wait for the new category links to load
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

    // Wait for it to disappear
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
): Promise<Product | null> {
  try {
    // 1. Regex Extraction & Safety Check
    const match = url.match(/-p(\d+)\.html/);
    if (!match) {
      console.log(`  --> ⚠️ No ID found in URL, skipping: ${url}`);
      return null;
    }
    const productId = match[1];

    // 2. Load the page safely
    await page.goto(url, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForSelector("h1", { timeout: 5000 });
    } catch {
      return null; // Page didn't load right, skip it
    }
    await new Promise((r) => setTimeout(r, 1500));
    // 3. Extract the DOM elements Safely!
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
      // Look for any of Zara's known price classes
      const priceElement = document.querySelector(
        ".money-amount__main, .price__amount-current, .price__amount",
      );
      return priceElement ? priceElement.textContent?.trim() || "0" : "0";
    });

    const rawImage = await page
      .$eval(".media-image__image", (el) => el.getAttribute("src") || "")
      .catch(() => "");
    let cleanColor = rawColor.split("|")[0].trim();

    const finalPrice = parseUniversalPrice(rawPrice);

    const cleanComposition = rawComposition.replace("Composition: ", "").trim();
    try {
      // 1. Click the "Add to Cart" button to trigger the size menu
      await page.evaluate(() => {
        const addBtn = document.querySelector(
          'button[data-qa-action="add-to-cart"]',
        );
        if (addBtn) (addBtn as HTMLButtonElement).click();
      });

      // 2. Wait for the slide-out menu animation to finish
      await new Promise((r) => setTimeout(r, 1000));

      // 3. Wait for the actual size labels to exist in the DOM
      await page.waitForSelector(".size-selector-sizes-size__label", {
        timeout: 3000,
      });
    } catch (e) {
      // Silent catch: if it fails, it might be a one-size item (like a hat or bag)
    }

    const sizes = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll(".size-selector-sizes-size__label"),
      );
      return elements.map((el) => el.textContent?.trim() || "").filter(Boolean);
    });
    // 4. Return the beautifully formatted object
    return {
      id: productId,
      name: rawName,
      price: finalPrice,
      currency: "TRY",
      brand: "Zara",
      imageUrl: rawImage,
      link: url,
      timestamp: new Date(),
      color: cleanColor,
      description: rawDescription,
      composition: cleanComposition,
      sizes: sizes,
      category: category,
    };
  } catch (error: any) {
    console.error(`  --> ❌ Zara Scraper crashed on ${url}:`);
    console.error(error.message);
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
      return elements
        .map((el) => (el as HTMLAnchorElement).href)
        .filter((href) => href !== "");
    });

    return [...new Set(links)];
  } catch (error) {
    console.log(
      `   --> ⚠️ No standard product grid found on this page (might be editorial). Skipping.`,
    );
    return [];
  }
}

// 4. THE CRAWLER (The Coordinator that uses all your tools)
export async function getZaraCategories(
  page: Page,
  department: string,
): Promise<string[]> {
  console.log("   --> 🕵️‍♂️ Crawler: Starting Category Discovery...");

  await page.goto("https://www.zara.com/tr/en/", {
    waitUntil: "domcontentloaded",
  });

  await handleGeoModal(page);

  const menuButtonSelector = '[data-qa-id="layout-desktop-open-menu-trigger"]';
  await page.waitForSelector(menuButtonSelector);
  await page.click(menuButtonSelector);

  await selectDepartment(page, department);

  // 5. Extract the Category Links
  const linkSelector = ".layout-categories-category-wrapper";
  await page.waitForSelector(linkSelector);

  const links = await page.$$eval(
    linkSelector,
    (elements, dept) => {
      return (
        elements
          .map((el) => (el as HTMLAnchorElement).href)
          // Filter dynamically based on the department name (e.g., '/man-', '/woman-', '/kids-')
          .filter((href) => href && href.includes(`/${dept.toLowerCase()}-`))
      );
    },
    department,
  );

  const uniqueLinks = [...new Set(links)];
  console.log(`   --> 🕵️‍♂️ Found ${uniqueLinks.length} categories.`);

  return uniqueLinks;
}
