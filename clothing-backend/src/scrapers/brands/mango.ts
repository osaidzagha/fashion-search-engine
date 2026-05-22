import { Page, HTTPResponse } from "puppeteer";

// ── 1. CATEGORY DISCOVERY (DOM EXTRACTION STRATEGY) ─────────────────────────
export async function getMangoCategories(
  page: Page,
  department: string = "man",
): Promise<string[]> {
  const isWoman = department.toLowerCase() === "woman";
  const deptSlug = isWoman ? "kadin" : "erkek";
  const targetUrl = `https://shop.mango.com/tr/tr/${deptSlug}`;

  console.log(`   --> 🗺️  Navigating to Mango hub: ${targetUrl}`);

  try {
    // Rely entirely on the Stealth plugin, remove forced headers.
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Go to the page and wait for the network to settle
    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Hard wait for 4 seconds to let React inject the mega-menu and clear initial WAF checks
    await new Promise((r) => setTimeout(r, 4000));

    // 👇 FIX: Explicitly pass the argument, define its type, and cast the return to string[]
    const categoryLinks = (await page.evaluate((slug: string) => {
      const links = Array.from(document.querySelectorAll("a"));
      const validLinks = new Set<string>();

      for (const a of links) {
        const href = a.href || "";
        if (href.includes(`/c/${slug}`) && !href.includes("/p/")) {
          validLinks.add(href.split("?")[0]);
        }
      }
      return Array.from(validLinks);
    }, deptSlug)) as string[];

    // 👇 FIX: categoryLinks is now explicitly a string array, so `link` is inferred correctly
    const filteredLinks = categoryLinks.filter((link: string) =>
      link.includes(`/c/${deptSlug}`),
    );

    if (!filteredLinks || filteredLinks.length === 0) {
      throw new Error(
        `0 links found. (Check the live browser window to see the block!)`,
      );
    }

    console.log(
      `   --> ✅ Discovered ${filteredLinks.length} ${department.toUpperCase()} categories.`,
    );
    return filteredLinks;
  } catch (error: any) {
    console.error(
      `   --> ❌ Category extraction failed for ${department}:`,
      error.message,
    );
    return [];
  }
}

// ── 2. PRODUCT LINK EXTRACTION ───────────────────────────────────────────────
export async function getMangoProductLinks(
  page: Page,
  categoryUrl: string,
): Promise<string[]> {
  try {
    await page.goto(categoryUrl, {
      waitUntil: "domcontentloaded",
      timeout: 120000, // 👈 INCREASED TIMEOUT
    });

    try {
      await page.waitForSelector('a[href*="/p/"]', { timeout: 15000 }); // Bumped slightly
    } catch {
      console.log(
        `   --> ⚠️  No products loaded in time on ${categoryUrl}. Moving on.`,
      );
      return [];
    }

    let stableCount = 0;
    while (stableCount < 3) {
      const before = await page.evaluate(function () {
        return document.body.scrollHeight;
      });
      await page.evaluate(function () {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise((r) => setTimeout(r, 1500));
      const after = await page.evaluate(function () {
        return document.body.scrollHeight;
      });
      stableCount = after === before ? stableCount + 1 : 0;
    }

    const rawLinks = await page.$$eval('a[href*="/p/"]', (anchors) =>
      anchors.map((a) => a.href),
    );

    const productLinks = [...new Set(rawLinks)].filter((link) =>
      link.match(/_\d{8}/),
    );

    console.log(
      `   --> 🕵️‍♂️  Found ${productLinks.length} product links in category.`,
    );
    return productLinks;
  } catch (error: any) {
    console.error(
      `   --> ❌ Error fetching Mango links from ${categoryUrl}:`,
      error.message,
    );
    return [];
  }
}

// ── 3. ENGLISH CONTENT HELPER (UPDATED) ──────────────────────────────────────
async function fetchEnglishContent(
  page: Page,
  turkishUrl: string,
): Promise<{
  name: string;
  description: string;
  category: string;
  composition: string;
}> {
  const gbEnUrl = turkishUrl.replace(
    "https://shop.mango.com/tr/tr/",
    "https://shop.mango.com/gb/en/",
  );

  try {
    const result = await page.evaluate(function (url) {
      return fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-GB,en;q=0.9",
        },
        credentials: "omit",
      })
        .then(function (res) {
          if (!res.ok) return null;
          return res.text();
        })
        .then(function (html) {
          if (!html) return null;
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, "text/html");

          var h1Text = doc.querySelector("h1")
            ? doc.querySelector("h1")!.textContent!.trim()
            : "";
          if (!h1Text || h1Text === "Men" || h1Text === "Women") return null;

          var detailContainer =
            doc.querySelector('[class*="ProductDetail"][class*="detail"]') ||
            doc.querySelector('[class*="Qualities"]');
          var description = "";
          if (detailContainer) {
            var clone = detailContainer.cloneNode(true) as HTMLElement;
            var badTags = clone.querySelectorAll(
              "a, button, nav, [class*='Stylist'], [class*='stylist']",
            );
            for (var i = 0; i < badTags.length; i++) {
              badTags[i].parentNode?.removeChild(badTags[i]);
            }
            description = clone.textContent
              ? clone.textContent.replace(/\s+/g, " ").trim()
              : "";

            description = description.replace(/Mango Stylist.*/i, "").trim();
            description = description
              .replace(/Ask about deliveries.*/i, "")
              .trim();
          }

          var breadcrumbItems = doc.querySelectorAll(
            '[class*="BreadcrumbBase"] [class*="listItem"] a',
          );
          var breadcrumbs = [];
          for (var j = 0; j < breadcrumbItems.length; j++) {
            var t = breadcrumbItems[j].textContent;
            if (t) breadcrumbs.push(t.trim());
          }
          var category =
            breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : "";

          var engComp = "";
          var fabricKeywords = [
            "cotton",
            "polyester",
            "elastane",
            "viscose",
            "wool",
            "lyocell",
            "linen",
            "nylon",
            "silk",
            "acrylic",
            "modal",
            "leather",
            "suede",
            "velvet",
            "tencel",
          ];

          if (description) {
            var sentences = description.split(/\.(?=\s|$)|;/);

            for (var s = 0; s < sentences.length; s++) {
              var sentence = sentences[s].trim();
              var lower = sentence.toLowerCase();

              var hasFabric = false;
              for (var w = 0; w < fabricKeywords.length; w++) {
                if (lower.indexOf(fabricKeywords[w]) !== -1) {
                  hasFabric = true;
                  break;
                }
              }

              if (
                hasFabric &&
                (/\d/.test(sentence) ||
                  lower.indexOf("blend") !== -1 ||
                  lower.indexOf("mix") !== -1 ||
                  lower.indexOf("fabric") !== -1)
              ) {
                engComp = sentence;
                break;
              }
            }
          }

          return {
            name: h1Text,
            description: description,
            category: category,
            composition: engComp,
          };
        });
    }, gbEnUrl);

    if (result && result.name) {
      console.log(
        `   --> 🌐 English: "${result.name}" | Cat: "${result.category}" | Comp: ${result.composition ? "✓" : "✗"}`,
      );
      return result;
    }
  } catch {
    // Fall through
  }
  return { name: "", description: "", category: "", composition: "" };
}

// ── 4. PRODUCT SCRAPING ──────────────────────────────────────────────────────
export async function scrapeMangoProductData(
  page: Page,
  url: string,
  category: string = "",
  department: string = "",
) {
  let pricePayload: Record<string, any> = {};
  let priceLocked = false;

  const turkishUrl = url.includes("/tr/tr/")
    ? url
    : url.replace("/tr/en/", "/tr/tr/");

  const responseHandler = async (response: HTTPResponse) => {
    if (priceLocked) return;
    const reqUrl = response.url();
    if (response.request().method() === "OPTIONS") return;
    try {
      if (reqUrl.includes("/v3/prices/products")) {
        const json = await response.json();
        if (Object.keys(json).length > 0) {
          pricePayload = json;
          priceLocked = true;
        }
      }
    } catch {
      // Ignore non-JSON
    }
  };

  try {
    page.on("response", responseHandler);

    await page.goto(turkishUrl, {
      waitUntil: "domcontentloaded",
      timeout: 120000, // 👈 INCREASED TIMEOUT
    });

    try {
      await page.waitForFunction(
        function () {
          var h1 = document.querySelector("h1");
          var text = h1 && h1.textContent ? h1.textContent.trim() : "";
          return (
            text.length > 0 &&
            text !== "Erkek" &&
            text !== "Kadın" &&
            text !== "Kadin"
          );
        },
        { timeout: 20000 }, // 👈 Bumped up as well
      );
    } catch {
      console.log(`   --> ⚠️  Hub redirect detected — skipping: ${turkishUrl}`);
      return null;
    }

    await new Promise((r) => setTimeout(r, 1500));

    const urlObj = new URL(turkishUrl);
    const colorCode = urlObj.searchParams.get("c") || "";
    const idMatch = turkishUrl.match(/_(\d{8})/);
    const productId = idMatch ? idMatch[1] : "UNKNOWN_ID";

    const urlBeforeClick = page.url();
    try {
      const accordionTriggers = await page.$$('[class*="ProductDetailsLink"]');
      if (accordionTriggers.length > 0) {
        await accordionTriggers[0].click();
        await new Promise((r) => setTimeout(r, 800));

        if (page.url() !== urlBeforeClick) {
          console.log(
            `   --> ⚠️  Accordion click navigated away — recovering...`,
          );
          await page.goBack({ waitUntil: "domcontentloaded", timeout: 25000 });
          await new Promise((r) => setTimeout(r, 500));
        } else {
          console.log(`   --> 🪗 Accordion clicked — composition exposed.`);
        }
      }
    } catch {
      // Ignore accordion errors
    }

    const domData = await page.evaluate(function () {
      var titleTr = "";
      var h1Specific = document.querySelector(
        '[class*="ProductDetail"][class*="title"] h1, h1[class*="ProductDetail"]',
      );
      if (h1Specific && h1Specific.textContent)
        titleTr = h1Specific.textContent.trim();
      else {
        var h1General = document.querySelector("h1");
        if (h1General && h1General.textContent)
          titleTr = h1General.textContent.trim();
      }

      var detailContainer =
        document.querySelector('[class*="ProductDetail"][class*="detail"]') ||
        document.querySelector('[class*="Qualities"]');
      var descriptionTr = "";
      if (detailContainer) {
        var clone = detailContainer.cloneNode(true) as HTMLElement;
        var badTags = clone.querySelectorAll("a, button, nav");
        for (var i = 0; i < badTags.length; i++) {
          badTags[i].parentNode?.removeChild(badTags[i]);
        }
        descriptionTr = clone.textContent
          ? clone.textContent.replace(/\s+/g, " ").trim()
          : "";
      }

      var imageItems = document.querySelectorAll('[class*="ImageGridItem"]');
      var rawImages = [];
      for (var k = 0; k < imageItems.length; k++) {
        var img = imageItems[k].querySelector("img");
        if (!img) continue;
        var srcset = img.getAttribute("srcset") || "";
        if (srcset) {
          var parts = srcset
            .split(",")
            .map(function (s) {
              return s.trim().split(" ")[0];
            })
            .filter(Boolean);
          if (parts.length > 0) rawImages.push(parts[parts.length - 1]);
        } else {
          var fallbackSrc =
            img.getAttribute("data-src") || img.getAttribute("src");
          if (fallbackSrc) rawImages.push(fallbackSrc);
        }
      }

      var videoItems = document.querySelectorAll(
        'video, [class*="video"] video, [data-testid*="video"]',
      );
      var rawVideos = [];
      for (var v = 0; v < videoItems.length; v++) {
        var vid = videoItems[v];
        var src = vid.getAttribute("src") || vid.getAttribute("data-src");
        if (!src) {
          var sourceTag = vid.querySelector('source[type="video/mp4"]');
          if (sourceTag) src = sourceTag.getAttribute("src");
        }
        if (src) rawVideos.push(src);
      }

      var breadcrumbItems = document.querySelectorAll(
        '[class*="BreadcrumbBase"] [class*="listItem"] a',
      );
      var breadcrumbs = [];
      for (var b = 0; b < breadcrumbItems.length; b++) {
        if (breadcrumbItems[b].textContent)
          breadcrumbs.push(breadcrumbItems[b].textContent!.trim());
      }
      var categoryTr =
        breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : "";

      var fabricKeywords = [
        "cotton",
        "polyester",
        "elastane",
        "viscose",
        "wool",
        "lyocell",
        "linen",
        "nylon",
        "silk",
        "acrylic",
        "modal",
        "pamuk",
        "polyamid",
        "viskon",
        "yün",
        "ipek",
        "keten",
        "naylon",
        "akrilik",
        "deri",
        "süet",
        "kadife",
        "tencel",
      ];
      var textNodes = document.querySelectorAll("p, span, li, td");
      var composition = "";
      for (var n = 0; n < textNodes.length; n++) {
        var el = textNodes[n];
        if (el.children.length > 0) continue;
        var text = el.textContent ? el.textContent.trim() : "";
        if (text.length > 0 && text.length < 120 && /^[\d%]/.test(text)) {
          var lowerText = text.toLowerCase();
          var found = false;
          for (var w = 0; w < fabricKeywords.length; w++) {
            if (lowerText.indexOf(fabricKeywords[w]) !== -1) {
              found = true;
              break;
            }
          }
          if (found) {
            composition = text;
            break;
          }
        }
      }

      var sizeItems = document.querySelectorAll('[class*="SizeItem"]');
      var sizes = [];
      for (var s = 0; s < sizeItems.length; s++) {
        var contentEl = sizeItems[s].querySelector('[class*="sizeInfo"]');
        if (!contentEl) continue;
        var isUnavailable =
          contentEl.className.indexOf("notAvailable") !== -1 ||
          sizeItems[s].className.indexOf("disabled") !== -1 ||
          sizeItems[s].getAttribute("aria-disabled") === "true";
        if (isUnavailable) continue;
        var sizeText = contentEl.textContent
          ? contentEl.textContent.trim().toUpperCase()
          : "";
        if (sizeText.length > 0 && sizeText.length <= 5) sizes.push(sizeText);
      }

      return {
        titleTr: titleTr,
        descriptionTr: descriptionTr,
        rawImages: rawImages,
        rawVideos: rawVideos,
        categoryTr: categoryTr,
        composition: composition,
        sizes: sizes,
      };
    });

    const english = await fetchEnglishContent(page, turkishUrl);
    const finalName = english.name || domData.titleTr;
    const finalDescription = english.description || domData.descriptionTr;
    const finalCategory = english.category || domData.categoryTr;
    const finalComposition = english.composition || domData.composition;

    const cleanImages = domData.rawImages
      .filter(
        (src: string) =>
          src &&
          !src.includes("icon") &&
          !src.includes("placeholder") &&
          !src.includes("data:"),
      )
      .map((src: string) =>
        src.startsWith("http") ? src : `https://shop.mango.com${src}`,
      );
    const uniqueImages = [...new Set(cleanImages)];

    const cleanVideos = (domData.rawVideos || [])
      .filter((src: string) => src && src.includes(".mp4"))
      .map((src: string) =>
        src.startsWith("http") ? src : `https://shop.mango.com${src}`,
      );
    const uniqueVideos = [...new Set(cleanVideos)];

    let finalPrice = 0;
    if (Object.keys(pricePayload).length > 0) {
      if (colorCode && pricePayload[colorCode]?.price) {
        finalPrice = Number(pricePayload[colorCode].price) || 0;
      } else {
        const firstKey = Object.keys(pricePayload).find(
          (k) => pricePayload[k]?.price,
        );
        if (firstKey) finalPrice = Number(pricePayload[firstKey].price) || 0;
      }
    }

    if (!finalName || finalPrice === 0) {
      console.log(
        `   --> ⚠️  Incomplete data — name: "${finalName}" | price: ${finalPrice} | url: ${turkishUrl}`,
      );
    } else {
      console.log(
        `   --> ✅ Mango: "${finalName}" | ${finalPrice} TRY | Cat: ${finalCategory} | Images: ${uniqueImages.length} | Sizes: ${domData.sizes.length} | Comp: ${finalComposition ? "✓" : "✗"}`,
      );
    }

    return {
      id: productId,
      name: finalName,
      price: finalPrice,
      currency: "TRY",
      brand: "Mango",
      category: finalCategory,
      department: department,
      composition: finalComposition,
      images: uniqueImages,
      videos: uniqueVideos,
      link: turkishUrl,
      timestamp: new Date(),
      color: colorCode || "Default",
      description: finalDescription,
      sizes: [...new Set(domData.sizes)],
    };
  } catch (error: any) {
    console.error(
      `   --> ❌ Mango scraper crashed on ${turkishUrl}:`,
      error.message,
    );
    return null;
  } finally {
    page.off("response", responseHandler);
  }
}
