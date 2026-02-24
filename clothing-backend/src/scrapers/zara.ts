import { Page } from "puppeteer";
import { Product } from "./interface";

async function selectDepartment(page: Page, department: string) {
  console.log(`Switching to ${department} department...`);

  const xpath = `::-p-xpath(//span[@class='layout-categories-category-name' and text()='${department}'])`;

  await page.waitForSelector(xpath, { timeout: 3000 });
  await page.click(xpath);
  await new Promise((r) => setTimeout(r, 2000));
  console.log(`   --> ${department} Department Selected.`);
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

export async function scrapeProductData(
  page: Page,
  url: string,
): Promise<Product | null> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForSelector("h1", { timeout: 5000 });
    } catch {
      return null;
    }

    const rawName = await page.$eval(
      "h1",
      (el) => el.textContent?.trim() || "Unknown",
    );
    const rawPrice = await page.$eval(
      ".money-amount__main",
      (el) => el.textContent?.trim() || "0",
    );
    const rawImage = await page.$eval(
      ".media-image__image",
      (el) => el.getAttribute("src") || "",
    );

    let cleanString = rawPrice.replace("TL", "").trim().replace(/,/g, "");
    const finalPrice = parseFloat(cleanString);

    return {
      name: rawName,
      price: finalPrice,
      currency: "TRY",
      brand: "Zara",
      imageUrl: rawImage,
      link: url,
      timestamp: new Date(),
    };
  } catch (error) {
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
