import puppeteer from "puppeteer";
import assert from "assert";
import { scrapeZaraProductData } from "./brands/zara.ts";
import { scrapeMassimoProductData } from "./brands/massimoDutti.ts";

async function runAutomatedTests() {
  console.log("🧪 Starting Automated QA Tests...");

  // 1. ARRANGE: Boot up the test environment
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // --- TEST 1: ZARA EXTRACTION ---
    console.log("Testing Zara Scraper...");

    // TODO: Paste a reliable Zara product link here
    const testZaraUrl =
      "https://www.zara.com/tr/en/straight-leg-chino-trousers-p04391448.html";

    // 2. ACT: Run the function
    const zaraResult = await scrapeZaraProductData(
      page,
      testZaraUrl,
      "test-category",
    );

    // 3. ASSERT: Prove the data is correct
    assert.ok(zaraResult !== null, "Zara scraper returned null!");
    assert.ok(zaraResult.name !== "Unknown", "Zara name failed to scrape!");
    assert.ok(zaraResult.price > 0, "Zara price failed to parse or is 0!");
    assert.ok(
      (zaraResult?.sizes?.length || 0) > 0,
      "Zara sizes array is empty!",
    );
    console.log("✅ Zara Test Passed!");

    // --- TEST 2: MASSIMO DUTTI EXTRACTION ---
    console.log("Testing Massimo Dutti Scraper...");

    const testMassimoUrl =
      "https://www.massimodutti.com/tr/american-tailoring-with-linen-pocket-detail-l03656550";
    const massimoResult = await scrapeMassimoProductData(
      page,
      testMassimoUrl,
      "test-category",
    );

    assert.ok(massimoResult !== null, "Massimo Dutti scraper returned null!");
    assert.ok(
      massimoResult.name !== "Unknown",
      "Massimo Dutti name failed to scrape!",
    );
    assert.ok(
      massimoResult.price > 0,
      "Massimo Dutti price failed to parse or is 0!",
    );
    assert.ok(
      (massimoResult?.sizes?.length || 0) > 0,
      "Massimo Dutti sizes array is empty!",
    );
    assert.ok(
      massimoResult.composition !== "Unknown" &&
        massimoResult.composition !== "",
      "Massimo Dutti composition failed to scrape!",
    );
    console.log("\n🎉 ALL TESTS PASSED! The pipeline is bulletproof.");
  } catch (error: any) {
    // If ANY assert.ok() fails, it drops down here and yells at us.
    console.error("\n❌ TEST FAILED:");
    console.error(error.message);
  } finally {
    await browser.close();
    console.log("💤 Test environment spun down.");
  }
}

runAutomatedTests();
