import { Page } from "puppeteer";
import { Product } from "../interface";
import { ProductModel } from "../../models/Product";
async function handleCookieConsent(page: Page) {
  try {
    await page.waitForSelector("#banner-accept-btn", { timeout: 3000 });
    await page.click("#banner-accept-btn");
    await new Promise((r) => setTimeout(r, 1000));
    console.log("   --> ✅ Cookie consent accepted");
  } catch {
    console.log("   --> No cookie consent found");
  }
}

async function scrapeCurrentProduct(
  page: Page,
  url: string,
  category: string,
): Promise<Product | null> {
  try {
    const match = url.match(/productpage\.(\d+)/);
    if (!match) return null;
    const productId = match[1];

    await handleCookieConsent(page);

    try {
      await page.waitForSelector('[data-testid="product-name"]', {
        timeout: 5000,
      });
    } catch {
      return null;
    }

    // Click accordions
    try {
      await page.click("#toggle-descriptionAccordion");
      await new Promise((r) => setTimeout(r, 500));
      await page.click("#toggle-materialsAndSuppliersAccordion");
      await new Promise((r) => setTimeout(r, 500));
    } catch {}

    const rawName = await page
      .$eval(
        '[data-testid="product-name"]',
        (el) => el.textContent?.trim() || "Unknown",
      )
      .catch(() => "Unknown");

    const rawPrice = await page
      .$eval(
        '[data-testid="white-price"]',
        (el) => el.textContent?.trim() || "0",
      )
      .catch(() => "0");

    const rawImage = await page
      .$eval(
        '[data-testid="next-image"] img',
        (el) => el.getAttribute("src") || "",
      )
      .catch(() => "");

    const rawColor = await page
      .$eval("p.d9bd46", (el) => el.textContent?.trim() || "")
      .catch(() => "");

    const rawDescription = await page
      .$eval(
        "#section-descriptionAccordion p.eb503e",
        (el) => el.textContent?.trim() || "",
      )
      .catch(() => "");

    const rawComposition = await page
      .$eval(
        "#section-materialsAndSuppliersAccordion li span.eb503e",
        (el) => el.textContent?.trim() || "",
      )
      .catch(() => "");

    const sizes = await page
      .$$eval('[data-testid^="sizeButton-"]', (elements) =>
        elements.map((el) => el.textContent?.trim() || ""),
      )
      .catch(() => []);

    const cleanPrice = parseFloat(
      rawPrice.replace("TL", "").trim().replace(/\./g, "").replace(",", "."),
    );

    return {
      id: `hm_${productId}`,
      name: rawName,
      price: cleanPrice,
      currency: "TRY",
      brand: "H&M",
      imageUrl: rawImage,
      link: url,
      timestamp: new Date(),
      color: rawColor,
      description: rawDescription,
      composition: rawComposition,
      sizes: sizes,
      category: category,
    };
  } catch {
    return null;
  }
}

export async function runHMPipeline(
  page: Page,
  departments: string[],
  maxPages: number = 3,
  testMode: boolean = true,
) {
  let totalSaved = 0;

  const categoryUrls: Record<string, string> = {
    MAN: "https://www2.hm.com/tr_tr/erkek/urune-gore-satin-al/view-all.html",
    WOMAN: "https://www2.hm.com/tr_tr/kadin/urune-gore-satin-al/view-all.html",
  };

  for (const dept of departments) {
    console.log(`\n🚀 H&M PIPELINE FOR: ${dept}`);
    const baseUrl = categoryUrls[dept];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const pageUrl = `${baseUrl}?page=${pageNum}`;
      console.log(`\n📂 Visiting page ${pageNum}: ${pageUrl}`);

      await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
      await handleCookieConsent(page);
      await new Promise((r) => setTimeout(r, 1500));

      // Get all product links on this page
      let productLinks: string[] = [];
      try {
        await page.waitForSelector("a.d8e2d9", { timeout: 5000 });
        productLinks = await page.$$eval("a.d8e2d9", (elements) =>
          elements
            .map((el) => (el as HTMLAnchorElement).href)
            .filter((href) => href.includes("productpage")),
        );
        productLinks = [...new Set(productLinks)];
        console.log(
          `   --> Found ${productLinks.length} products on page ${pageNum}`,
        );
      } catch {
        console.log(`   --> No products found on page ${pageNum}, stopping.`);
        break;
      }

      const toScrape = testMode ? productLinks.slice(0, 2) : productLinks;

      // Click each product, scrape it, go back
      for (const productUrl of toScrape) {
        console.log(`   --> Visiting product: ${productUrl}`);

        try {
          // Use evaluate to click via JavaScript — more reliable than CSS selector click
          await page.evaluate((url) => {
            const links = Array.from(document.querySelectorAll("a.d8e2d9"));
            const target = links.find((el) =>
              (el as HTMLAnchorElement).href.includes(url.split("/tr_tr/")[1]),
            ) as HTMLAnchorElement;
            if (target) target.click();
          }, productUrl);

          await page.waitForNavigation({
            waitUntil: "domcontentloaded",
            timeout: 8000,
          });
          await new Promise((r) => setTimeout(r, 2000));
        } catch {
          console.log(`   --> ⚠️ Navigation failed, skipping.`);
          // Navigate back to category page before continuing
          await page.goto(`${baseUrl}?page=${pageNum}`, {
            waitUntil: "domcontentloaded",
          });
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }

        // Scrape the product
        const product = await scrapeCurrentProduct(
          page,
          productUrl,
          dept.toLowerCase(),
        );

        if (product) {
          try {
            await ProductModel.findOneAndUpdate({ id: product.id }, product, {
              upsert: true,
              returnDocument: "after",
            });
            console.log(`   --> 💾 Saved: ${product.name}`);
            totalSaved++;
          } catch {
            console.log(`   --> ❌ DB Error saving ${product.name}`);
          }
        }

        // Go back to category page
        await page.goBack({ waitUntil: "domcontentloaded" });
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  return totalSaved;
}

// Keep these as stubs so scraperManager imports don't break
export async function getHMCategories(
  page: Page,
  department: string,
): Promise<string[]> {
  return [];
}
export async function getHMProductLinks(
  page: Page,
  url: string,
): Promise<string[]> {
  return [];
}
export async function scrapeHMProductData(
  page: Page,
  url: string,
  category: string = "",
): Promise<Product | null> {
  return null;
}
