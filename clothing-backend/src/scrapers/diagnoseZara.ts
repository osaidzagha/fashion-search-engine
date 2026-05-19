import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // 👈 VISIBLE browser so you can watch it
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  );

  console.log("Navigating to Zara...");
  await page.goto("https://www.zara.com/tr/en/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 5000));

  // ── 1. Dump everything clickable in the header ─────────────────────────────
  console.log("\n=== HEADER CLICKABLE ELEMENTS ===");
  const headerElements = await page.evaluate(() => {
    const header = document.querySelector("header") ?? document.body;
    return Array.from(
      header.querySelectorAll("button, a, [role='button'], [tabindex]"),
    )
      .slice(0, 20)
      .map((el) => ({
        tag: el.tagName,
        id: el.id || null,
        class: el.className?.toString().trim().slice(0, 120) || null,
        ariaLabel: el.getAttribute("aria-label"),
        dataQa:
          el.getAttribute("data-qa-id") ?? el.getAttribute("data-qa-action"),
        text: el.textContent?.trim().slice(0, 40) || null,
        visible: (el as HTMLElement).offsetParent !== null,
      }));
  });
  console.log(JSON.stringify(headerElements, null, 2));

  // ── 2. Find anything that LOOKS like a hamburger ───────────────────────────
  console.log("\n=== HAMBURGER CANDIDATES ===");
  const hamburgerCandidates = await page.evaluate(() => {
    const keywords = [
      "menu",
      "hamburger",
      "burger",
      "nav",
      "open",
      "sidebar",
      "catalog",
    ];
    return Array.from(document.querySelectorAll("*"))
      .filter((el) => {
        const cls = el.className?.toString().toLowerCase() ?? "";
        const qa = el.getAttribute("data-qa-id")?.toLowerCase() ?? "";
        const aria = el.getAttribute("aria-label")?.toLowerCase() ?? "";
        return keywords.some(
          (k) => cls.includes(k) || qa.includes(k) || aria.includes(k),
        );
      })
      .slice(0, 15)
      .map((el) => ({
        tag: el.tagName,
        class: el.className?.toString().trim().slice(0, 120),
        ariaLabel: el.getAttribute("aria-label"),
        dataQa: el.getAttribute("data-qa-id"),
        visible: (el as HTMLElement).offsetParent !== null,
      }));
  });
  console.log(JSON.stringify(hamburgerCandidates, null, 2));

  // ── 3. Check existing /man- or /woman- links WITHOUT clicking anything ─────
  console.log("\n=== PRE-RENDERED CATEGORY LINKS (no click needed?) ===");
  const preRenderedLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .map((a) => a.href)
      .filter((h) => h.includes("/man-") || h.includes("/woman-"))
      .slice(0, 10);
  });
  console.log(preRenderedLinks);

  // ── 4. Try clicking the hamburger by the classes you gave me ──────────────
  console.log("\n=== CLICKING .layout-desktop-open-menu ===");
  const clickResult = await page.evaluate(() => {
    const el = document.querySelector(
      ".layout-desktop-open-menu",
    ) as HTMLElement;
    if (!el) return "NOT FOUND in DOM";
    el.click();
    return `Clicked. Class: ${el.className}`;
  });
  console.log(clickResult);
  await new Promise((r) => setTimeout(r, 4000));

  // ── 5. What appeared after the click? ─────────────────────────────────────
  console.log("\n=== LINKS AFTER MENU CLICK ===");
  const postClickLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .map((a) => a.href)
      .filter((h) => h.includes("/man-") || h.includes("/woman-"))
      .slice(0, 15);
  });
  console.log(postClickLinks);

  console.log(
    "\n=== DONE. Check the browser window. Press Ctrl+C to close. ===",
  );
  // Keep browser open so you can inspect manually
  await new Promise((r) => setTimeout(r, 60000));
  await browser.close();
})();
