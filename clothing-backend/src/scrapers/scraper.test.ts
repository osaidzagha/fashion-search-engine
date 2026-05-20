import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// ─── Inline the pure functions under test ────────────────────────────────────
// (Copy them here so tests are self-contained and don't need a live DB/browser)

function parseUniversalPrice(rawPrice: string): number | undefined {
  if (!rawPrice) return undefined;
  let cleanStr = rawPrice.replace(/[^\d.,]/g, "");
  if (!cleanStr) return undefined;
  const lastComma = cleanStr.lastIndexOf(",");
  const lastDot = cleanStr.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      cleanStr = cleanStr.replace(/\./g, "").replace(",", ".");
    } else {
      cleanStr = cleanStr.replace(/,/g, "");
    }
  } else if (lastDot > -1 && lastComma === -1) {
    if (cleanStr.length - lastDot === 4) {
      cleanStr = cleanStr.replace(/\./g, "");
    }
  } else if (lastComma > -1 && lastDot === -1) {
    cleanStr = cleanStr.replace(",", ".");
  }
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? undefined : parsed;
}

function extractZaraCategoryLinks(xmlText: string, dept: string): string[] {
  const locMatches = xmlText.match(/<loc>(.*?)<\/loc>/g) || [];
  const locs = locMatches.map((m) => m.replace(/<\/?loc>/g, "").trim());
  return [
    ...new Set(
      locs.filter(
        (href) =>
          href.includes(`/${dept}-`) &&
          !href.includes("-p") &&
          href.includes("zara.com/tr/en/"),
      ),
    ),
  ];
}

const shuffleArray = (array: any[]) => {
  return [...array].sort(() => Math.random() - 0.5);
};

// ─── 1. parseUniversalPrice ───────────────────────────────────────────────────

describe("parseUniversalPrice", () => {
  // Happy path — Turkish / EU format
  it("parses TR/EU format with dot as thousands sep and comma as decimal (1.790,00)", () => {
    expect(parseUniversalPrice("1.790,00")).toBe(1790);
  });

  it("parses TR/EU format with currency symbol prefix (₺2.990,00)", () => {
    expect(parseUniversalPrice("₺2.990,00")).toBe(2990);
  });

  it("parses US format with comma as thousands sep and dot as decimal (1,790.00)", () => {
    expect(parseUniversalPrice("1,790.00")).toBe(1790);
  });

  it("parses a plain integer string ('2990')", () => {
    expect(parseUniversalPrice("2990")).toBe(2990);
  });

  it("parses a dot-decimal float with two decimal places (29.90)", () => {
    expect(parseUniversalPrice("29.90")).toBe(29.9);
  });

  it("treats a dot followed by exactly 3 digits as a thousands separator (2.990 → 2990)", () => {
    expect(parseUniversalPrice("2.990")).toBe(2990);
  });

  it("parses comma-only decimal format (2990,00 → 2990)", () => {
    expect(parseUniversalPrice("2990,00")).toBe(2990);
  });

  it("strips whitespace and currency text around the number ('TL 1.499,99')", () => {
    expect(parseUniversalPrice("TL 1.499,99")).toBe(1499.99);
  });

  it("parses a sale price with surrounding DOM noise ('  699,00 TRY  ')", () => {
    expect(parseUniversalPrice("  699,00 TRY  ")).toBe(699);
  });

  // Edge cases
  it("returns undefined for an empty string", () => {
    expect(parseUniversalPrice("")).toBeUndefined();
  });

  it("returns undefined for a string with no digits ('TRY')", () => {
    expect(parseUniversalPrice("TRY")).toBeUndefined();
  });

  it("returns undefined for a non-numeric garbage string ('N/A')", () => {
    expect(parseUniversalPrice("N/A")).toBeUndefined();
  });

  it("returns undefined for a string that is only symbols ('.,,')", () => {
    // After stripping non-digit/non-.,: '.,,' → parseFloat('') is NaN
    expect(parseUniversalPrice(".,,")).toBeUndefined();
  });

  it("handles a zero price string ('0,00') → 0", () => {
    expect(parseUniversalPrice("0,00")).toBe(0);
  });

  it("handles very large prices without losing precision (12.345.678,99)", () => {
    expect(parseUniversalPrice("12.345.678,99")).toBeCloseTo(12345678.99, 2);
  });
});

// ─── 2. extractZaraCategoryLinks ─────────────────────────────────────────────

const buildXml = (locs: string[]) =>
  locs.map((l) => `<loc>${l}</loc>`).join("\n");

describe("extractZaraCategoryLinks", () => {
  const womanUrl = "https://www.zara.com/tr/en/woman-shirts-l1217.html";
  const manUrl = "https://www.zara.com/tr/en/man-suits-l808.html";
  const productUrl = "https://www.zara.com/tr/en/woman-shirt-p12345678.html";
  const otherRegionUrl = "https://www.zara.com/us/en/woman-shirts-l1217.html";

  // Happy path
  it("returns matching category links for the given department", () => {
    const xml = buildXml([womanUrl, manUrl]);
    expect(extractZaraCategoryLinks(xml, "woman")).toContain(womanUrl);
  });

  it("excludes links that don't match the requested department", () => {
    const xml = buildXml([womanUrl, manUrl]);
    const result = extractZaraCategoryLinks(xml, "woman");
    expect(result).not.toContain(manUrl);
  });

  it("excludes product links that contain '-p'", () => {
    const xml = buildXml([womanUrl, productUrl]);
    const result = extractZaraCategoryLinks(xml, "woman");
    expect(result).not.toContain(productUrl);
  });

  it("excludes links from other regional domains (e.g. /us/en/)", () => {
    const xml = buildXml([womanUrl, otherRegionUrl]);
    const result = extractZaraCategoryLinks(xml, "woman");
    expect(result).not.toContain(otherRegionUrl);
  });

  it("deduplicates identical URLs", () => {
    const xml = buildXml([womanUrl, womanUrl, womanUrl]);
    const result = extractZaraCategoryLinks(xml, "woman");
    expect(result.filter((u) => u === womanUrl)).toHaveLength(1);
  });

  it("returns multiple distinct matching links", () => {
    const second = "https://www.zara.com/tr/en/woman-trousers-l1050.html";
    const xml = buildXml([womanUrl, second, manUrl]);
    const result = extractZaraCategoryLinks(xml, "woman");
    expect(result).toContain(womanUrl);
    expect(result).toContain(second);
    expect(result).toHaveLength(2);
  });

  // Edge cases
  it("returns an empty array when xml is empty", () => {
    expect(extractZaraCategoryLinks("", "woman")).toEqual([]);
  });

  it("returns an empty array when no links match the department", () => {
    const xml = buildXml([manUrl]);
    expect(extractZaraCategoryLinks(xml, "woman")).toEqual([]);
  });

  it("returns an empty array when xml has no <loc> tags", () => {
    expect(
      extractZaraCategoryLinks("<sitemap><url></url></sitemap>", "woman"),
    ).toEqual([]);
  });

  it("handles department name 'man' without accidentally matching 'woman'", () => {
    // 'woman' includes '/woman-' which does NOT include '/man-', so no bleed-over
    const xml = buildXml([womanUrl, manUrl]);
    const result = extractZaraCategoryLinks(xml, "man");
    expect(result).toContain(manUrl);
    expect(result).not.toContain(womanUrl);
  });
});

// ─── 3. shuffleArray ─────────────────────────────────────────────────────────

describe("shuffleArray", () => {
  it("returns an array of the same length", () => {
    expect(shuffleArray([1, 2, 3, 4, 5])).toHaveLength(5);
  });

  it("contains all the same elements as the original", () => {
    const original = [1, 2, 3, 4, 5];
    expect(shuffleArray(original).sort()).toEqual([...original].sort());
  });

  it("does not mutate the original array", () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffleArray(original);
    expect(original).toEqual(copy);
  });

  it("returns a new array reference", () => {
    const original = [1, 2, 3];
    expect(shuffleArray(original)).not.toBe(original);
  });

  it("handles an empty array", () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it("handles a single-element array", () => {
    expect(shuffleArray(["only"])).toEqual(["only"]);
  });

  it("handles arrays of objects without corrupting them", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = shuffleArray(items);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id).sort()).toEqual([1, 2, 3]);
  });
});

// ─── 4. runScraperPipeline ───────────────────────────────────────────────────

// vi.mock is hoisted to the top of the file by vitest automatically.
// The path must exactly match what runScraperPipeline.ts imports.
vi.mock("../models/Product", () => ({
  ProductModel: {
    findOne: vi.fn().mockResolvedValue(null),
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

// Import the pipeline and the mock at module level so vi.mocked() works
import { runScraperPipeline } from "./runScraperPipeline";
import { ProductModel } from "../models/Product";

function makePage(overrides: Partial<Record<string, any>> = {}) {
  const page: any = {
    isClosed: vi.fn().mockReturnValue(false),
    setViewport: vi.fn().mockResolvedValue(undefined),
    setCacheEnabled: vi.fn().mockResolvedValue(undefined),
    setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
    setUserAgent: vi.fn().mockResolvedValue(undefined),
    setRequestInterception: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    goto: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    cookies: vi.fn().mockResolvedValue([]),
    setCookie: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return page;
}

describe("runScraperPipeline", () => {
  let browser: any;
  let mockPage: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockPage = makePage();
    browser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      userAgent: vi.fn().mockResolvedValue("HeadlessChrome/120"),
    };

    // Default: product not found (lean returns null)
    vi.mocked(ProductModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(ProductModel.findOneAndUpdate).mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper: run pipeline while auto-advancing fake timers
  async function run(...args: Parameters<typeof runScraperPipeline>) {
    const promise = runScraperPipeline(...args);
    await vi.runAllTimersAsync(); // flush every setTimeout in safeWipe/warmup
    return promise;
  }

  it("returns zero counts when departments array is empty", async () => {
    const result = await run(
      browser,
      "Zara",
      [],
      vi.fn(),
      vi.fn(),
      vi.fn(),
      true,
    );
    expect(result).toEqual({ newItems: 0, updatedItems: 0, errorCount: 0 });
  });

  it("returns zero counts when getCategories returns an empty list", async () => {
    const getCategories = vi.fn().mockResolvedValue([]);
    const result = await run(
      browser,
      "Zara",
      ["WOMAN"],
      getCategories,
      vi.fn(),
      vi.fn(),
      true,
    );
    expect(result).toEqual({ newItems: 0, updatedItems: 0, errorCount: 0 });
    expect(getCategories).toHaveBeenCalledWith(expect.anything(), "WOMAN");
  });

  it("returns zero counts when getLinks returns an empty list", async () => {
    const result = await run(
      browser,
      "Zara",
      ["WOMAN"],
      vi
        .fn()
        .mockResolvedValue([
          "https://www.zara.com/tr/en/woman-shirts-l1217.html",
        ]),
      vi.fn().mockResolvedValue([]),
      vi.fn(),
      true,
    );
    expect(result).toEqual({ newItems: 0, updatedItems: 0, errorCount: 0 });
  });

  it("increments newItems when scrapeProduct returns a product not in DB", async () => {
    const fakeProduct = {
      id: "abc123",
      name: "Linen Shirt",
      price: 999,
      brand: "Zara",
      category: "shirts",
      department: "WOMAN",
      link: "https://www.zara.com/tr/en/shirt-p123.html",
      currency: "TRY",
      images: [],
    };

    const result = await run(
      browser,
      "Zara",
      ["WOMAN"],
      vi
        .fn()
        .mockResolvedValue(["https://www.zara.com/tr/en/woman-shirts-l1.html"]),
      vi.fn().mockResolvedValue(["https://www.zara.com/tr/en/shirt-p123.html"]),
      vi.fn().mockResolvedValue(fakeProduct),
      true,
    );
    expect(result.newItems).toBe(1);
    expect(result.updatedItems).toBe(0);
    expect(result.errorCount).toBe(0);
  });

  it("increments updatedItems when product already exists in DB with same price", async () => {
    vi.mocked(ProductModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ price: 999 }),
    } as any);

    const fakeProduct = {
      id: "abc123",
      name: "Linen Shirt",
      price: 999,
      brand: "Zara",
      category: "shirts",
      department: "WOMAN",
      link: "https://www.zara.com/tr/en/shirt-p123.html",
      currency: "TRY",
      images: [],
    };

    const result = await run(
      browser,
      "Zara",
      ["WOMAN"],
      vi
        .fn()
        .mockResolvedValue(["https://www.zara.com/tr/en/woman-shirts-l1.html"]),
      vi.fn().mockResolvedValue(["https://www.zara.com/tr/en/shirt-p123.html"]),
      vi.fn().mockResolvedValue(fakeProduct),
      true,
    );
    expect(result.updatedItems).toBe(1);
    expect(result.newItems).toBe(0);
  });

  it("increments errorCount when scrapeProduct throws a non-fatal error", async () => {
    const result = await run(
      browser,
      "Zara",
      ["WOMAN"],
      vi
        .fn()
        .mockResolvedValue(["https://www.zara.com/tr/en/woman-shirts-l1.html"]),
      vi.fn().mockResolvedValue(["https://www.zara.com/tr/en/shirt-p123.html"]),
      vi.fn().mockRejectedValue(new Error("Selector timeout")),
      true,
    );
    expect(result.errorCount).toBe(1);
    expect(result.newItems).toBe(0);
  });

  it("does not increment errorCount on 'Target closed' — halts gracefully", async () => {
    mockPage.isClosed.mockReturnValue(true);
    const result = await run(
      browser,
      "Zara",
      ["WOMAN"],
      vi
        .fn()
        .mockResolvedValue(["https://www.zara.com/tr/en/woman-shirts-l1.html"]),
      vi.fn().mockResolvedValue(["https://www.zara.com/tr/en/shirt-p123.html"]),
      vi.fn().mockRejectedValue(new Error("Target closed")),
      true,
    );
    expect(result.errorCount).toBe(0);
  });

  it("skips null scrapeProduct return without counting as error", async () => {
    const result = await run(
      browser,
      "Zara",
      ["WOMAN"],
      vi
        .fn()
        .mockResolvedValue(["https://www.zara.com/tr/en/woman-shirts-l1.html"]),
      vi.fn().mockResolvedValue(["https://www.zara.com/tr/en/shirt-p123.html"]),
      vi.fn().mockResolvedValue(null),
      true,
    );
    expect(result).toEqual({ newItems: 0, updatedItems: 0, errorCount: 0 });
  });

  it("in testMode uses at most 1 category and 2 products", async () => {
    const getLinks = vi
      .fn()
      .mockResolvedValue(
        Array.from(
          { length: 20 },
          (_, i) => `https://zara.com/shirt-p${i}.html`,
        ),
      );
    const scrapeProduct = vi.fn().mockResolvedValue(null);

    await run(
      browser,
      "Zara",
      ["WOMAN"],
      vi
        .fn()
        .mockResolvedValue(
          Array.from(
            { length: 10 },
            (_, i) => `https://zara.com/cat-l${i}.html`,
          ),
        ),
      getLinks,
      scrapeProduct,
      true,
    );

    expect(getLinks).toHaveBeenCalledTimes(1);
    expect(scrapeProduct.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
