import { Page } from "puppeteer";
import { Product } from "../interface";

/**
 * Helper to dismiss any initial modals on Pull & Bear
 */
async function dismissModals(page: Page) {
  await page
    .evaluate(
      `
    (function() {
      var cookieBtn = document.querySelector('#onetrust-accept-btn-handler');
      if (cookieBtn) cookieBtn.click();
      var geoBtn = document.querySelector('.geo-modal-btn-stay'); // generic class, adjust if needed
      if (geoBtn) geoBtn.click();
    })()
  `,
    )
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));
}

// ─── 1. CATEGORY CRAWLER ──────────────────────────────────────────────────────
export async function getPullAndBearCategories(
  page: Page,
  department: string,
): Promise<string[]> {
  const isMan = department.toUpperCase() === "MAN";

  // Use the generic hub URLs
  const deptSlug = isMan ? "erkek-n6228" : "kadin-n6417";
  const baseUrl = `https://www.pullandbear.com/tr/en/${deptSlug}`;

  console.log(`\n🔍 Crawler: Navigating to P&B ${department} Hub: ${baseUrl}`);

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await dismissModals(page);

    // Give React a moment to render the categories
    await new Promise((r) => setTimeout(r, 3000));

    // 👇 THE MASSIMO PATTERN: Define both Turkish and English paths
    const deptPathTR = isMan ? "/erkek" : "/kadin";
    const deptPathEN = isMan ? "/man" : "/woman";

    const categoryLinks = (await page.evaluate(
      (pathTR, pathEN) => {
        return Array.from(document.querySelectorAll("a"))
          .map((el) => el.href)
          .filter((href) => {
            if (!href) return false;

            // 1. Must contain the department slug
            const isCorrectDept =
              href.includes(pathTR) || href.includes(pathEN);

            // 2. The Massimo Defense: block products and total-looks
            const isNotProductOrLook =
              !href.includes("total-look") && !href.includes("-l0");

            // 3. THE "HOME" BLOCKER: Ignore the root domain or landing pages
            // If the URL ends exactly with the department slug or is just the domain, skip it.
            const isNotHome =
              !href.endsWith(pathTR) &&
              !href.endsWith(pathEN) &&
              href !== "https://www.pullandbear.com/tr/en/";

            // 4. Ensure it's a category link (usually contains '-n' followed by numbers)
            const isActualCategory = /-n\d+/.test(href);

            return (
              isCorrectDept &&
              isNotProductOrLook &&
              isNotHome &&
              isActualCategory
            );
          });
      },
      deptPathTR,
      deptPathEN,
    )) as string[];

    const cleanLinks = [...new Set(categoryLinks)];
    console.log(
      `  --> 🕵️‍♂️ Found ${cleanLinks.length} dynamic categories for ${department}.`,
    );
    return cleanLinks;
  } catch (error: any) {
    console.error(
      `  --> ❌ Failed to get Pull & Bear categories for ${department}:`,
      error.message,
    );
    return [];
  }
}

// ─── 2. PRODUCT LINK CRAWLER ──────────────────────────────────────────────────
export async function getPullAndBearProductLinks(
  page: Page,
  url: string,
): Promise<string[]> {
  console.log(`📂 Visiting Pull & Bear category: ${url}`);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await dismissModals(page);

    let productLinks: string[] = [];
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `  --> 📜 Auto-scrolling to trigger lazy load (Attempt ${attempt})...`,
      );

      await page.evaluate(`
        (function() {
          return new Promise(function(resolve) {
            var totalHeight = 0;
            var distance = 800; 
            var scrolls = 0;
            var maxScrolls = 40; 
            
            var timer = setInterval(function() {
              window.scrollBy(0, distance);
              totalHeight += distance;
              scrolls++;
              if (totalHeight >= document.body.scrollHeight || scrolls >= maxScrolls) {
                clearInterval(timer);
                resolve(undefined);
              }
            }, 600); 
          });
        })()
      `);

      // 👇 FIX: Added the double backslash (\\?) to the regex!
      productLinks = (await page.evaluate(`
        (function() {
          return Array.from(document.querySelectorAll('a'))
            .map(function(a) { return a.href; })
            .filter(function(href) {
              // Double backslash required here!
              return /-l[a-zA-Z0-9]{8}(\\?|$)/.test(href);
            })
            .map(function(href) { return href; }) 
            .filter(function(href, index, self) { return self.indexOf(href) === index; });
        })()
      `)) as string[];

      if (productLinks.length > 0) {
        console.log(
          `  --> ✅ Success! Found ${productLinks.length} product links.`,
        );
        break;
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 3000));
    }

    return productLinks;
  } catch (error: any) {
    console.log(`  --> ⚠️ Error finding links on P&B page: ${error.message}`);
    return [];
  }
}

// ─── 3. THE MASTER API PRODUCT SCRAPER ────────────────────────────────────────
export async function scrapePullAndBearProductData(
  page: Page,
  url: string,
  category: string = "",
  department: string = "",
): Promise<Product | null> {
  console.log(`   --> API Scraping Pull & Bear product: ${url}`);

  const urlObj = new URL(url);
  const cleanUrl = url.split("?")[0];

  const match = cleanUrl.match(/-l([a-zA-Z0-9]{8})$/);
  if (!match) {
    console.log(`  --> ⚠️ URL format unexpected, skipping.`);
    return null;
  }

  const rawId = match[1];
  const productId = `pb_${rawId}`;
  const targetColorId = urlObj.searchParams.get("cS");

  let productJson: any = null;

  // ─── THE NEW SHAPE-BASED WIRETAP ────────────────────────────────────────
  const responseHandler = async (response: any) => {
    const reqUrl = response.url();

    // Catch ANY Inditex API request
    if (reqUrl.includes("itxrest")) {
      try {
        const json = await response.json();
        const data = json.id ? json : json[0]; // Sometimes it's wrapped in an array

        // SONAR: Did we catch something that looks like our product data?
        if (
          data &&
          data.name &&
          (data.bundleColors || data.colors || data.bundleProductSummaries)
        ) {
          console.log(
            `🔍 [SONAR] Caught product payload from: ${reqUrl.split("?")[0]}`,
          );
          productJson = data;
        }
      } catch (e) {
        // Silently ignore binary/non-JSON payloads
      }
    }
  };

  page.on("response", responseHandler);

  try {
    // Navigate and wait for network activity to settle slightly
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Give the heavy React page time to fetch the API (up to 8 seconds)
    let retries = 80;
    while (!productJson && retries > 0) {
      await new Promise((r) => setTimeout(r, 100));
      retries--;
    }

    if (!productJson) {
      console.log(`  --> ⚠️ Failed to intercept JSON for ${url}`);
      return null;
    }

    // ─── DATA EXTRACTION & MAPPING ────────────────────────────────────────

    const colorsArray =
      productJson.colors ||
      productJson.bundleProductSummaries?.[0]?.detail?.colors ||
      [];
    let colorObj = null;

    if (targetColorId) {
      colorObj = colorsArray.find(
        (c: any) =>
          c.id === targetColorId || c.catentryId === parseInt(targetColorId),
      );
    }
    if (!colorObj) colorObj = colorsArray[0];

    if (!colorObj) {
      console.log(`  --> ⚠️ Could not locate color variations in JSON.`);
      return null;
    }

    const cleanColorName = colorObj.name || "";

    const firstValidSize = colorObj.sizes?.find((s: any) => s.price);
    if (!firstValidSize) {
      console.log(`  --> ⚠️ No pricing found in JSON for this color.`);
      return null;
    }

    const finalPrice = parseInt(firstValidSize.price) / 100;
    const originalPriceRaw = firstValidSize.oldPrice;
    const finalOriginalPrice = originalPriceRaw
      ? parseInt(originalPriceRaw) / 100
      : undefined;

    const availableSizes = colorObj.sizes
      .filter((s: any) => s.isBuyable || s.visibilityValue === "SHOW")
      .map((s: any) => s.name);

    // 3. Extract Composition
    let cleanComposition = "";
    const compArray =
      colorObj.composition ||
      productJson.composition ||
      productJson.bundleProductSummaries?.[0]?.detail?.composition;

    if (compArray && compArray.length > 0) {
      // Grab all objects related to the outer shell (usually part "1")
      const shellParts = compArray.filter(
        (p: any) => p.part === "1" || !p.part,
      );
      const materials: string[] = [];
      shellParts.forEach((p: any) => {
        if (p.composition) {
          p.composition.forEach((c: any) =>
            materials.push(`${c.percentage}% ${c.name}`),
          );
        }
      });
      cleanComposition = materials.join(", ");
    }

    const xmediaArray =
      productJson.xmedia ||
      productJson.bundleProductSummaries?.[0]?.detail?.xmedia ||
      [];
    const targetXmedia =
      xmediaArray.find((x: any) => x.colorCode === colorObj.id) ||
      xmediaArray[0];

    // ── 1. Strict Curated Buckets ──
    const modelShots: string[] = [];
    const mannequinShots: string[] = [];
    const detailShots: string[] = [];
    const fallbackShots: string[] = []; // Used for sets 3+ (Shoe angles!)
    const videos: string[] = [];

    const seenFileNames = new Set<string>();

    if (targetXmedia && targetXmedia.xmediaItems) {
      targetXmedia.xmediaItems.forEach((item: any) => {
        // 👇 FIX 1: Allow all sets, but still kill hardcoded ICONs
        const setNum = Number(item.set);
        if (item.mediaType === "ICON") return;

        let bestImageForThisAngle = "";
        let bestVideoForThisAngle = "";

        if (item.medias) {
          item.medias.forEach((media: any) => {
            const mediaUrl = media.deliveryUrl || media.url;
            if (!mediaUrl) return;

            const cleanMediaUrl = mediaUrl.split("?")[0].split("&")[0];
            const finalMediaUrl = cleanMediaUrl.startsWith("http")
              ? cleanMediaUrl
              : `https://static.pullandbear.net${cleanMediaUrl}`;

            const lowerUrl = finalMediaUrl.toLowerCase();

            const isBadKeyword = [
              "swatch",
              "texture",
              "icon",
              "transparent",
              "color",
              "patch",
              "parche",
              "thumb",
              "_sw",
              "_th",
              "-r.jpg",
              "-r/",
            ].some((kw) => lowerUrl.includes(kw));

            const isPromo = [
              "promo",
              "campaign",
              "editorial",
              "text",
              "banner",
              "lettering",
            ].some((kw) => lowerUrl.includes(kw));

            // 👇 FIX 2: Bring back the Swatch Pattern regex to kill UI icons since we are allowing sets 3+
            const isSwatchPattern = /(_5_1_|_6_1_|_7_1_|_8_1_|_9_1_)/.test(
              lowerUrl,
            );

            if (isBadKeyword || isPromo || isSwatchPattern) return;

            if (lowerUrl.includes(".mp4")) {
              if (!bestVideoForThisAngle) bestVideoForThisAngle = finalMediaUrl;
            } else if (
              lowerUrl.includes(".jpg") ||
              lowerUrl.includes(".jpeg") ||
              lowerUrl.includes(".png")
            ) {
              if (!bestImageForThisAngle) bestImageForThisAngle = finalMediaUrl;
            }
          });
        }

        // ── 2. THE PATH DEDUPLICATOR ──
        if (bestImageForThisAngle) {
          // FIX: Instead of extracting just the filename, we use the entire clean URL (Folder + Filename).
          // This allows multiple "-M.jpg" files as long as they are in different hash folders.
          const uniqueKey = bestImageForThisAngle.split("?")[0];

          if (!seenFileNames.has(uniqueKey)) {
            seenFileNames.add(uniqueKey);

            // Sort into the correct bucket so the UI looks perfect
            if (setNum === 0) modelShots.push(bestImageForThisAngle);
            else if (setNum === 1) mannequinShots.push(bestImageForThisAngle);
            else if (setNum === 2) detailShots.push(bestImageForThisAngle);
            else fallbackShots.push(bestImageForThisAngle);
          }
        }

        if (bestVideoForThisAngle && !videos.includes(bestVideoForThisAngle)) {
          videos.push(bestVideoForThisAngle);
        }
      });
    }

    // ── Assemble the Perfect Array ──
    let curatedImages = [
      ...modelShots.slice(0, 6),
      ...mannequinShots.slice(0, 4),
      ...detailShots.slice(0, 3),
      ...fallbackShots.slice(0, 5), // 👈 Append the extra shoe angles at the end!
    ];
    // If P&B forgot to label their sets entirely, use the fallback
    if (curatedImages.length === 0) {
      curatedImages = fallbackShots.reverse().slice(0, 8);
    }
    const rawName = productJson.name || "";
    const rawDescription =
      productJson.longDescription || productJson.detail?.longDescription || "";

    console.log(
      `   --> ✅ Images: ${curatedImages.length} | Videos: ${videos.length} | Price: ${finalPrice} | Name: ${rawName}`,
    );

    return {
      id: productId,
      name: rawName,
      price: finalPrice,
      ...(finalOriginalPrice !== undefined && {
        originalPrice: finalOriginalPrice,
      }),
      currency: "TRY",
      brand: "Pull & Bear",
      images: curatedImages, // 👈 BEAUTIFULLY DEDUPLICATED AND ORDERED!
      videos: videos.length > 0 ? videos : undefined,
      link: url,
      timestamp: new Date(),
      color: cleanColorName,
      description: rawDescription,
      composition: cleanComposition,
      sizes: availableSizes,
      category: category,
      department: department,
    };
  } catch (error: any) {
    console.error(
      `   --> ❌ Pull & Bear Scraper crashed on ${url}:`,
      error.message,
    );
    return null;
  } finally {
    page.off("response", responseHandler);
  }
}
