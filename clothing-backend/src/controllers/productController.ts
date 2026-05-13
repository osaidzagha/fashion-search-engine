import { Request, Response } from "express";
import { ProductModel } from "../models/Product";

// ─── Synonym map (Strict Equivalence) ─────────────────────────────────────────
const synonymMap: Record<string, string> = {
  // ── BOTTOMS ──
  pants: "trousers chino cargo pant slacks pants",
  trousers: "trousers pant pants chino slacks",
  jeans: "denim jean jeans",
  joggers: "jogger sweatpant sweatpants track",
  shorts: "bermuda shorts trunks",
  skirt: "skirt skort",

  // ── TOPS ──
  top: "shirt blouse tee tshirt crop tank corset",
  tops: "shirt blouse tee tshirt crop tank corset",
  tshirt: "tee t-shirt tshirt graphic basic",
  "t-shirt": "tee t-shirt tshirt graphic basic",
  shirt: "button-down button-up overshirt shirt blouse",
  polo: "polo pique",

  // ── LAYERS & OUTERWEAR ──
  hoodie: "sweatshirt hooded zip hoodie",
  sweater: "knitwear pullover knit jumper sweater cardigan",
  jumper: "knitwear pullover knit jumper sweater cardigan",
  jacket: "jacket bomber windbreaker puffer anorak",
  coat: "coat overcoat trench parka peacoat outerwear",
  suit: "suit tuxedo tailoring",
  blazer: "blazer sportcoat",

  // ── ONE-PIECES ──
  dress: "dress gown",

  // ── FOOTWEAR & ACCESSORIES ──
  shoes: "sneaker boot trainer loafer shoe sandal",
  bag: "bag purse tote clutch crossbody backpack",

  // ── MATERIALS ──
  linen: "linen flax",
  denim: "denim jean jeans",
  leather: "leather faux nappa suede",
};

// ─── The Master Exclusion Map ─────────────────────────────────────────────────
const excludeMap: Record<string, string> = {
  trousers: "short shorts suit blazer dress skirt",
  pant: "short shorts suit blazer dress skirt",
  pants: "short shorts suit blazer dress skirt",
  jeans: "short shorts skirt dress jacket shirt",
  short: "sleeve dress jacket coat boot boots skirt",
  shorts: "sleeve dress jacket coat boot boots skirt",
  shirt: "jacket coat blazer overshirt dress skirt pant trousers",
  top: "jacket coat bag handle stitched shoe sneakers skirt pants",
  tops: "jacket coat bag handle stitched shoe sneakers skirt pants",
  jacket: "shirt dress skirt pants",
  coat: "shirt dress skirt pants",
  sweater: "sweatpant sweatpants jogger joggers",
  sweatpant: "sweater cardigan",
  sweatpants: "sweater cardigan",
  dress: "shirt pant pants trouser trousers shoe shoes boot boots sneaker",
  suit: "swimsuit tracksuit bodysuit jumpsuit playsuit romper",
  boot: "jeans pant pants trousers trouser skirt dress shirt jacket bag",
  boots: "jeans pant pants trousers trouser skirt dress shirt jacket bag",
  shoe: "jeans pant pants trousers trouser skirt dress shirt jacket bag horn tree",
  shoes:
    "jeans pant pants trousers trouser skirt dress shirt jacket bag horn tree",
  sneaker: "jeans pant pants trousers trouser skirt dress shirt jacket bag",
  sneakers: "jeans pant pants trousers trouser skirt dress shirt jacket bag",
  bag: "jeans pant pants trousers trouser skirt dress shirt jacket boot boots shoe shoes",
  bags: "jeans pant pants trousers trouser skirt dress shirt jacket boot boots shoe shoes",
  trunk: "swimsuit swim boardshort",
  trunks: "luggage suitcase bag",
  belt: "jeans pant pants trousers trouser skirt dress shirt jacket coat",
  belts: "jeans pant pants trousers trouser skirt dress shirt jacket coat",
  tie: "dye waist front dress shirt blouse pant pants",
  ties: "dye waist front dress shirt blouse pant pants",
  chain: "bag handbag shoe shoes boot boots loafer loafers",
  ring: "zip zipper detail bag shoe neck",
  watch: "cap beanie hat",
};

// ─── Build a filter from query params ────────────────────────────────────────
function buildBaseFilter(query: any): any {
  const filter: any = {};

  if (
    query.maxPrice &&
    query.maxPrice !== "undefined" &&
    query.maxPrice !== "null"
  ) {
    const priceNum = Number(query.maxPrice);
    if (!isNaN(priceNum) && priceNum > 0) {
      filter.price = { $lte: priceNum };
    }
  }
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

  if (query.onSale === "true") {
    filter.originalPrice = { $exists: true, $ne: null, $gt: 0 };
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

    const rawSearch = (
      (req.query.search as string) || (req.query.q as string)
    )?.trim();

    const isCategoryMode = req.query.mode === "category";

    if (rawSearch) {
      const cleanSearch = rawSearch.replace(/[-&|©]/g, " ");

      if (isCategoryMode) {
        // ── CATEGORY NAV: precise regex against name + category only ──────────
        // Split the taxonomy q string into individual terms and match with word boundaries
        const terms = cleanSearch
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 1)
          .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); // escape regex chars

        if (terms.length > 0) {
          const regexPattern = `\\b(${terms.join("|")})\\b`;
          const regex = new RegExp(regexPattern, "i");

          filter.$or = [{ category: regex }, { name: regex }];
        }
      } else {
        // ── USER SEARCH: existing $text + synonym + exclusion logic ───────────
        const userWords = cleanSearch
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 0);

        if (userWords.length > 0) {
          let textSearchTerms: string[] = [];
          let excludeTerms: string[] = [];

          userWords.forEach((word) => {
            const isPlural =
              word.endsWith("s") &&
              !["jeans", "pants", "shorts", "shoes", "dress"].includes(word);
            const singular = isPlural ? word.slice(0, -1) : word;

            textSearchTerms.push(word);

            const mappedSynonyms = synonymMap[word] || synonymMap[singular];
            if (mappedSynonyms) {
              textSearchTerms.push(...mappedSynonyms.split(/\s+/));
            }

            const mappedExcludes = excludeMap[word] || excludeMap[singular];
            if (mappedExcludes) {
              excludeTerms.push(...mappedExcludes.split(/\s+/));
            }
          });

          const uniqueSearchTerms = Array.from(new Set(textSearchTerms));
          const uniqueExcludeTerms = Array.from(new Set(excludeTerms));

          let finalMongoSearchString = uniqueSearchTerms.join(" ");
          if (uniqueExcludeTerms.length > 0) {
            finalMongoSearchString +=
              " " + uniqueExcludeTerms.map((ex) => `-${ex}`).join(" ");
          }

          filter.$text = { $search: finalMongoSearchString };

          if (uniqueExcludeTerms.length > 0) {
            const excludePattern = uniqueExcludeTerms.join("|");
            const excludeRegex = new RegExp(`\\b(${excludePattern})\\b`, "i");
            filter.$and = filter.$and || [];
            filter.$and.push({ name: { $not: excludeRegex } });
            filter.$and.push({ category: { $not: excludeRegex } });
          }
        }
      }
    }

    // ── 1. THE PAYLOAD DIET (EXCLUSION STRATEGY) ──
    let projection: any = {
      priceHistory: 0,
      description: 0,
      composition: 0,
      videos: 0,
    };

    // Fix sort — "newest" must override text score sort
    if (
      filter.$text &&
      Object.keys(sortOption).length === 0 &&
      req.query.sort !== "newest"
    ) {
      projection.score = { $meta: "textScore" };
      sortOption = { score: { $meta: "textScore" } };
    }

    // "newest" always wins regardless of text index
    if (req.query.sort === "newest") {
      sortOption = { timestamp: -1 };
    }

    // ── 2. THE LEAN QUERY ──
    const [allProducts, total] = await Promise.all([
      ProductModel.find(filter, projection)
        .sort(Object.keys(sortOption).length ? sortOption : { timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

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

// ─── DELETE /api/admin/products/:id ───────────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    // Assuming your products use a custom string 'id' from the scraper, not just MongoDB's '_id'
    const deletedProduct = await ProductModel.findOneAndDelete({
      id: req.params.id,
    });

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Product permanently deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── GET /api/products/featured ───────────────────────────────────────────────
export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const deptFilter: any = {};
    if (req.query.department || req.query.departments) {
      const dept = (req.query.department || req.query.departments) as string;
      const deptList = dept.split(",").map((d) => d.trim().toUpperCase());
      const regexParts = deptList.map((d) => {
        if (d === "MAN" || d === "MEN") return "\\b(man|men|mens|men's)\\b";
        return "\\b(woman|women|womens|women's)\\b";
      });
      deptFilter.department = { $regex: regexParts.join("|"), $options: "i" };
    }

    const NON_CLOTHING_CATEGORY_RE =
      /hair|perfume|fragrance|cologne|accessori|belt|wallet|watch|jewel/i;

    // THE OMNI-QUERY: Shared video search logic
    const videoOmniQuery = {
      $or: [
        { video: { $exists: true, $nin: [null, ""] } },
        { videoUrl: { $exists: true, $nin: [null, ""] } },
        { videos: { $exists: true, $not: { $size: 0 } } },
        { "media.type": "video" },
        { "media.url": { $regex: "mp4", $options: "i" } },
      ],
      images: { $exists: true, $not: { $size: 0 } },
      ...deptFilter,
    };

    const [
      onSaleRaw,
      newInRaw,
      withVideoRaw,
      campaignHeroesRaw,
      jackets,
      shirts,
      trousers,
      knitwear,
    ] = await Promise.allSettled([
      // ── 1. On sale — Sorted by RECENCY first, then discount ──
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
        // Prioritize fresh drops over older, steeper discounts
        { $sort: { timestamp: -1, discountPct: -1 } },
        { $limit: 12 },
      ]),

      // ── 2. New In — Brand Agnostic (Now includes Mango & Future Brands!) ──
      ProductModel.find({
        images: { $exists: true, $not: { $size: 0 } },
        ...deptFilter,
      })
        .sort({ timestamp: -1 })
        .limit(15)
        .lean(),

      // ── 3. Editor's Choice (All Videos) ──
      ProductModel.find(videoOmniQuery)
        .sort({ timestamp: -1 })
        .limit(20)
        .lean(),

      // ── 4. Dedicated Campaign Heroes ──
      ProductModel.find({
        isCampaignHero: true,
        ...videoOmniQuery, // Ensure it actually has a video
      })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean(),

      // ── Category hero tiles ──
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

    const rawVideoProducts: any[] = getValue(withVideoRaw) || [];
    const campaignHeroes: any[] = getValue(campaignHeroesRaw) || [];

    // Filter non-clothing from Editor's Choice
    const withVideo = rawVideoProducts.filter(
      (p) =>
        !NON_CLOTHING_CATEGORY_RE.test(p.category || "") &&
        !NON_CLOTHING_CATEGORY_RE.test(p.name || ""),
    );

    return res.status(200).json({
      onSale: getValue(onSaleRaw) || [],
      newIn: getValue(newInRaw) || [], // Unified array!
      withVideo,
      campaignHeroes,
      categoryTiles: {
        jackets: getValue(jackets),
        shirts: getValue(shirts),
        trousers: getValue(trousers),
        knitwear: getValue(knitwear),
      },
    });
  } catch (error) {
    console.error("Error fetching featured:", error);
    return res.status(500).json({ message: "Server Error" });
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
    suggestions.add(q.toLowerCase());
    products.forEach((p) => suggestions.add(p.name.toLowerCase()));

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

// ─── GET /api/categories ─────────────────────────────────────────────────────
export const getCategories = async (req: Request, res: Response) => {
  try {
    const potentialCategories = [
      "jacket",
      "shirt",
      "trouser",
      "jean",
      "short",
      "hoodie",
      "sweater",
      "suit",
      "blazer",
      "shoe",
      "bag",
      "polo",
    ];

    const deptFilter: any = {};
    if (req.query.departments) {
      const depts = (req.query.departments as string).split(",");
      const regexParts = depts.map((d) => {
        const upper = d.trim().toUpperCase();
        if (upper === "MAN" || upper === "MEN")
          return "\\b(man|men|mens|men's)\\b";
        if (upper === "WOMAN" || upper === "WOMEN")
          return "\\b(woman|women|womens|women's)\\b";
        return `^${d}$`;
      });
      deptFilter.department = { $regex: regexParts.join("|"), $options: "i" };
    }

    const results = await ProductModel.aggregate([
      { $match: deptFilter },
      {
        $group: {
          _id: null,
          allNames: { $push: { $toLower: "$name" } },
          allCats: { $push: { $toLower: "$category" } },
        },
      },
    ]);

    // better: just do one $facet with regex per category
    const pipeline = potentialCategories.map((cat) => ({
      $match: {
        ...deptFilter,
        $or: [
          { name: { $regex: cat, $options: "i" } },
          { category: { $regex: cat, $options: "i" } },
        ],
      },
    }));

    const active: string[] = [];
    await Promise.all(
      potentialCategories.map(async (cat) => {
        const exists = await ProductModel.exists({
          ...deptFilter,
          $or: [
            { name: { $regex: cat, $options: "i" } },
            { category: { $regex: cat, $options: "i" } },
          ],
        });
        if (exists)
          active.push(cat.charAt(0).toUpperCase() + cat.slice(1) + "s");
      }),
    );
    return res.status(200).json(active.sort());
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE /api/products/:id/media
export const deleteProductMedia = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params; // This is the string ID like 'pb_03671510'
    const { mediaUrls } = req.body;

    if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      res.status(400).json({ error: "No media URLs provided." });
      return;
    }

    // Notice we use findOneAndUpdate({ id: id }) to match your custom ID string
    const updatedProduct = await ProductModel.findOneAndUpdate(
      { id: id },
      {
        $pullAll: {
          images: mediaUrls,
          videos: mediaUrls,
        },
      },
      { new: true },
    );

    if (!updatedProduct) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error("[ProductController] Delete Media Error:", error);
    res.status(500).json({ error: "Failed to delete media." });
  }
};

// ─── GET /api/products/:id/related ───────────────────────────────────────────
export const getRelatedProducts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Fetch the target product so we know what we are comparing against
    const currentProduct = await ProductModel.findOne({ id }).lean();
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2. Build the Search String (The "DNA" of the product)
    // We combine the name and category to give the text index good keywords.
    const searchString =
      `${currentProduct.name} ${currentProduct.category || ""}`.trim();

    // 3. The Hybrid Query
    let relatedProducts = await ProductModel.find(
      {
        $text: { $search: searchString },
        id: { $ne: id }, // SAFETY: Do not recommend the exact same product
        department: currentProduct.department, // SAFETY: Stay in the same department
      },
      {
        score: { $meta: "textScore" }, // Get the relevance score
        description: 0, // Payload diet: keep the response light
        priceHistory: 0,
      },
    )
      .sort({ score: { $meta: "textScore" } }) // Sort by most relevant first
      .limit(4) // Only send back 4 items for the UI carousel
      .lean();

    // 4. The Fallback (Just in case the text search is too narrow)
    if (relatedProducts.length === 0 && currentProduct.category) {
      relatedProducts = await ProductModel.find({
        id: { $ne: id },
        department: currentProduct.department,
        category: { $regex: currentProduct.category, $options: "i" },
      })
        .sort({ timestamp: -1 })
        .limit(4)
        .lean();
    }
    // Tier 3: same brand
    if (relatedProducts.length === 0) {
      relatedProducts = await ProductModel.find({
        id: { $ne: id },
        department: currentProduct.department,
        brand: currentProduct.brand,
      })
        .sort({ timestamp: -1 })
        .limit(4)
        .lean();
    }
    return res.status(200).json(relatedProducts);
  } catch (error) {
    console.error("Error fetching related products:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
