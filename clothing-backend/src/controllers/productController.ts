import { Request, Response } from "express";
import { ProductModel } from "../models/Product";

// ─── Synonym map (Strict Equivalence) ─────────────────────────────────────────
const synonymMap: Record<string, string> = {
  // ── BOTTOMS ──
  pants: "trousers chino cargo pant slacks pants",
  trousers: "trousers pant pants chino slacks",
  jeans: "denim jean jeans", // Removed "jogger" (joggers are usually sweatpants, not denim)
  joggers: "jogger sweatpant sweatpants track", // Added dedicated category
  shorts: "bermuda short shorts trunks",
  skirt: "skirt skort", // Removed midi/maxi to prevent bleeding into dresses

  // ── TOPS ──
  tshirt: "tee t-shirt tshirt graphic basic", // Removed "top" and "shirt" to prevent button-down bleed
  "t-shirt": "tee t-shirt tshirt graphic basic",
  shirt: "button-down button-up overshirt shirt blouse", // Added specific shirt terms
  polo: "polo pique", // Removed "knit" and "shirt" to keep it strictly polos

  // ── LAYERS & OUTERWEAR ──
  hoodie: "sweatshirt hooded zip hoodie",
  sweater: "knitwear pullover knit jumper sweater cardigan",
  jumper: "knitwear pullover knit jumper sweater cardigan",
  jacket: "jacket bomber windbreaker puffer anorak", // Removed "coat" (coats are longer)
  coat: "coat overcoat trench parka peacoat outerwear", // Removed "jacket"
  suit: "suit tuxedo tailoring", // Stripped out 'blazer' & 'trousers' to stop the grid bug!
  blazer: "blazer sportcoat", // Gave blazer its own strict entry

  // ── ONE-PIECES ──
  dress: "dress gown", // Removed midi/maxi to prevent bleeding into skirts

  // ── FOOTWEAR & ACCESSORIES ──
  shoes: "sneaker boot trainer loafer shoe sandal",
  bag: "bag purse tote clutch crossbody backpack",

  // ── MATERIALS (Keep these extremely strict) ──
  linen: "linen flax", // Removed "summer light" (too broad)
  denim: "denim jean jeans",
  leather: "leather faux nappa suede",
};

// ─── Exclusion map (Anti-Pollution) ──────────────────────────────────────────
// 👇 NEW: If they search the key, BAN these words from the results
const excludeMap: Record<string, string> = {
  trousers: "short shorts suit blazer dress skirt",
  pant: "short shorts suit blazer dress skirt",
  pants: "short shorts suit blazer dress skirt",
  jeans: "short shorts skirt dress",
  shirt: "jacket coat blazer overshirt",
  jacket: "shirt",
  coat: "shirt",
};

function expandSearch(raw: string): string {
  const key = raw.toLowerCase().trim();
  return synonymMap[key] ? `${raw} ${synonymMap[key]}` : raw;
}

// ─── Build a filter from query params ────────────────────────────────────────
function buildBaseFilter(query: any): any {
  const filter: any = {};

  if (query.maxPrice) filter.price = { $lte: Number(query.maxPrice) };

  if (query.brand) {
    filter.brand = {
      $in: (query.brand as string).split(",").map((b: string) => b.trim()),
    };
  }

  if (query.departments) {
    const depts = Array.isArray(query.departments)
      ? query.departments
      : (query.departments as string).split(",").map((d: string) => d.trim());

    const regexParts = depts.map((dept: string) => {
      const d = dept.toUpperCase();
      if (d === "MAN" || d === "MEN") return "\\b(man|men|mens|men's)\\b";
      if (d === "WOMAN" || d === "WOMEN")
        return "\\b(woman|women|womens|women's)\\b";
      return `^${dept}$`;
    });
    filter.department = { $regex: regexParts.join("|"), $options: "i" };
  }

  if (query.sizes) {
    filter.sizes = {
      $in: (query.sizes as string).split(",").map((s: string) => s.trim()),
    };
  }

  if (query.colors) {
    filter.color = {
      $in: (query.colors as string).split(",").map((c: string) => c.trim()),
    };
  }

  return filter;
}

// ─── GET /api/products ────────────────────────────────────────────────────────
export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const baseFilter = buildBaseFilter(req.query);
    let sortOption: any = {};
    if (req.query.sort === "lowest") sortOption.price = 1;
    else if (req.query.sort === "highest") sortOption.price = -1;

    let filter: any = { ...baseFilter };

    // Catch both 'search' and 'q' so the backend never ignores the frontend
    const rawSearch = (
      (req.query.search as string) || (req.query.q as string)
    )?.trim();

    if (rawSearch) {
      // Clean the input (remove hyphens so they don't break the strict AND logic)
      const cleanSearch = rawSearch.replace(/[-&|©]/g, " ");
      const userWords = cleanSearch
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 0);

      if (userWords.length > 0) {
        // 1. Build a strict AND array for the user's words
        const andConditions = userWords.map((word) => {
          const isPlural =
            word.endsWith("s") &&
            !["jeans", "pants", "shorts", "shoes", "dress"].includes(word);
          const singular = isPlural ? word.slice(0, -1) : word;

          const mappedSynonyms = synonymMap[word] || synonymMap[singular];
          const synonymsString = mappedSynonyms
            ? `${word} ${mappedSynonyms}`
            : word;

          const searchTerms = Array.from(
            new Set(synonymsString.split(/\s+/).filter((w) => w.length > 0)),
          );

          const orArray = searchTerms.flatMap((term) => {
            const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(safeTerm, "i");
            return [{ name: regex }, { category: regex }, { color: regex }];
          });

          return { $or: orArray };
        });

        // 👇 2. NEW: Build an exclusion list based on the user's words
        const excludeTerms: string[] = [];
        userWords.forEach((word) => {
          const isPlural =
            word.endsWith("s") &&
            !["jeans", "pants", "shorts", "shoes", "dress"].includes(word);
          const singular = isPlural ? word.slice(0, -1) : word;

          const mappedExcludes = excludeMap[word] || excludeMap[singular];
          if (mappedExcludes) {
            excludeTerms.push(...mappedExcludes.split(" "));
          }
        });

        // 3. Attach the AND conditions to the base filter
        filter = {
          ...baseFilter,
          $and: andConditions,
        };

        // 👇 4. NEW: If we found words to exclude, ban them from the name and category!
        if (excludeTerms.length > 0) {
          const excludePattern = excludeTerms.join("|");
          const excludeRegex = new RegExp(`\\b(${excludePattern})\\b`, "i");

          filter.$and.push({ name: { $not: excludeRegex } });
          filter.$and.push({ category: { $not: excludeRegex } });
        }
      }
    }
    const [allProducts, total] = await Promise.all([
      ProductModel.find(filter)
        .sort(Object.keys(sortOption).length ? sortOption : { timestamp: -1 })
        .skip(skip)
        .limit(limit),
      ProductModel.countDocuments(filter),
    ]);

    // ── Dynamic facets ──
    const [facetResult] = await ProductModel.aggregate([
      { $match: filter },
      {
        $facet: {
          sizes: [
            { $unwind: "$sizes" },
            { $match: { sizes: { $ne: "" } } },
            { $group: { _id: "$sizes" } },
            { $sort: { _id: 1 } },
          ],
          colors: [
            { $match: { color: { $exists: true, $ne: "" } } },
            { $group: { _id: "$color", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
          ],
        },
      },
    ]);

    return res.status(200).json({
      products: allProducts,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      availableSizes: (facetResult?.sizes || []).map((s: any) => s._id),
      availableColors: (facetResult?.colors || []).map((c: any) => c._id),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── GET /api/products/:id ────────────────────────────────────────────────────
export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await ProductModel.findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── GET /api/products/featured ───────────────────────────────────────────────
export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const deptFilter: any = {};
    if (req.query.department || req.query.departments) {
      const dept = (req.query.department || req.query.departments) as string;
      const d = dept.toUpperCase();
      const regexStr =
        d === "MAN" || d === "MEN"
          ? "\\b(man|men|mens|men's)\\b"
          : "\\b(woman|women|womens|women's)\\b";
      deptFilter.department = { $regex: regexStr, $options: "i" };
    }
    // 👇 2. Add ...deptFilter to every single query inside Promise.allSettled
    const [
      onSaleRaw,
      newInZara,
      newInMassimo,
      jackets,
      shirts,
      trousers,
      knitwear,
    ] = await Promise.allSettled([
      // On sale
      ProductModel.aggregate([
        {
          $match: {
            originalPrice: { $exists: true, $ne: null, $gt: 0 },
            ...deptFilter,
          },
        },
        {
          $addFields: {
            discountPct: {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$originalPrice", "$price"] },
                    "$originalPrice",
                  ],
                },
                100,
              ],
            },
          },
        },
        { $sort: { discountPct: -1 } },
        { $limit: 12 },
      ]),

      // New in Zara
      ProductModel.find({
        brand: "Zara",
        images: { $exists: true, $not: { $size: 0 } },
        ...deptFilter,
      })
        .sort({ timestamp: -1 })
        .limit(8)
        .lean(),

      // New in Massimo
      ProductModel.find({
        brand: "Massimo Dutti",
        images: { $exists: true, $not: { $size: 0 } },
        ...deptFilter,
      })
        .sort({ timestamp: -1 })
        .limit(8)
        .lean(),

      // Category hero products
      ProductModel.findOne({
        category: { $regex: "jacket", $options: "i" },
        images: { $exists: true, $not: { $size: 0 } },
        ...deptFilter,
      })
        .sort({ timestamp: -1 })
        .lean(),
      ProductModel.findOne({
        category: { $regex: "shirt", $options: "i" },
        images: { $exists: true, $not: { $size: 0 } },
        ...deptFilter,
      })
        .sort({ timestamp: -1 })
        .lean(),
      ProductModel.findOne({
        category: { $regex: "trouser|pant|jean", $options: "i" },
        images: { $exists: true, $not: { $size: 0 } },
        ...deptFilter,
      })
        .sort({ timestamp: -1 })
        .lean(),
      ProductModel.findOne({
        category: { $regex: "knit|sweater|jumper", $options: "i" },
        images: { $exists: true, $not: { $size: 0 } },
        ...deptFilter,
      })
        .sort({ timestamp: -1 })
        .lean(),
    ]);

    const getValue = (result: PromiseSettledResult<any>) =>
      result.status === "fulfilled" ? result.value : null;

    return res.status(200).json({
      onSale: getValue(onSaleRaw) || [],
      newIn: {
        zara: getValue(newInZara) || [],
        massimo: getValue(newInMassimo) || [],
      },
      categoryTiles: {
        jackets: getValue(jackets),
        shirts: getValue(shirts),
        trousers: getValue(trousers),
        knitwear: getValue(knitwear),
      },
    });
  } catch (error) {
    console.error("Error fetching featured:", error);
    // ✅ Always return a valid shape so the frontend doesn't crash
    res.status(200).json({
      onSale: [],
      newIn: { zara: [], massimo: [] },
      categoryTiles: {
        jackets: null,
        shirts: null,
        trousers: null,
        knitwear: null,
      },
    });
  }
};

// ─── GET /api/products/suggestions ───────────────────────────────────────────
export const getSearchSuggestions = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) return res.status(200).json([]);

    const regex = new RegExp(q, "i");
    const products = await ProductModel.find(
      { name: regex },
      { name: 1, category: 1 },
    )
      .limit(30)
      .lean();

    const suggestions = new Set<string>();

    // Suggest the exact phrase they are typing
    suggestions.add(q.toLowerCase());

    // Suggest exact product names that match
    products.forEach((p) => {
      suggestions.add(p.name.toLowerCase());
    });

    // Clean up, convert to Title Case, and limit to 6 clean results
    const finalList = Array.from(suggestions)
      .slice(0, 6)
      .map((str) =>
        str
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      );

    return res.status(200).json(finalList);
  } catch (error) {
    console.error("Suggestions error:", error);
    res.status(200).json([]);
  }
};
