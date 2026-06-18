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

  // ── ACTIVEWEAR ──
  activewear:
    "sport sports training running gym fitness ski legging tracksuit yoga",
  sport: "activewear training running gym fitness ski active",

  // ── FOOTWEAR & ACCESSORIES ──
  shoes: "sneaker boot trainer loafer shoe sandal",
  bag: "bag purse tote clutch crossbody backpack",

  // ── MATERIALS ──
  linen: "linen flax",
  denim: "denim jean jeans",
  leather: "leather faux nappa suede",
};

// ─── Exclusion map ────────────────────────────────────────────────────────────
const excludeMap: Record<string, string> = {
  trousers: "short shorts suit blazer dress skirt",
  pant: "short shorts suit blazer dress skirt",
  pants: "short shorts suit blazer dress skirt",
  jeans: "short shorts skirt dress jacket shirt",
  short: "sleeve dress jacket coat boot boots skirt",
  shorts: "sleeve dress jacket coat boot boots skirt",
  shirt: "jacket coat blazer dress skirt pant trousers",
  top: "jacket coat bag handle stitched shoe sneakers skirt pants",
  tops: "jacket coat bag handle stitched shoe sneakers skirt pants",
  jacket:
    "shirt dress skirt pants blazer suit tuxedo waistcoat sportcoat tailored",
  blazer: "bomber puffer windbreaker anorak padded quilted gilet tracksuit",
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
  sandal:
    "hair slide clip barrette scrunchie earring necklace bracelet ring belt bag jeans pant pants trouser trousers shirt jacket coat dress skirt",
  sandals:
    "hair slide clip barrette scrunchie earring necklace bracelet ring belt bag jeans pant pants trouser trousers shirt jacket coat dress skirt",
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
  jewelry:
    "shoe shoes boot boots clog clogs sneaker sneakers bag bags backpack crossbody socks jacket coat sweater",
  jewellery:
    "shoe shoes boot boots clog clogs sneaker sneakers bag bags backpack crossbody socks jacket coat sweater",
  jewel:
    "shoe shoes boot boots clog clogs sneaker sneakers bag bags backpack crossbody socks jacket coat sweater",
  accessory:
    "shoe shoes boot boots clog clogs sneaker sneakers jacket coat sweater",
  accessories:
    "shoe shoes boot boots clog clogs sneaker sneakers jacket coat sweater",
  bucket: "bag bags tote shopper backpack crossbody",
  heel: "sneaker sneakers trainer trainers",
  heels: "sneaker sneakers trainer trainers",
  thong: "sandal sandals flip-flop slide shoe shoes",
};

// ─── Build base filter from query params ──────────────────────────────────────
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
    filter.$expr = { $gt: ["$originalPrice", "$price"] };
  }

  if (query.hasVideo === "true") {
    filter.$or = [
      { video: { $exists: true, $nin: [null, ""] } },
      { videoUrl: { $exists: true, $nin: [null, ""] } },
      { videos: { $exists: true, $not: { $size: 0 } } },
      { "media.type": "video" },
      { "media.url": { $regex: "mp4", $options: "i" } },
    ];
    filter.images = { $exists: true, $not: { $size: 0 } };
  }

  // OOS filter: by default include all products; pass hideOOS=true to exclude OOS
  if (query.hideOOS === "true") {
    filter.available = { $ne: false };
  }

  return filter;
}

// ─── Build search filter from raw search string ───────────────────────────────
function applySearchFilter(
  filter: any,
  rawSearch: string,
  isCategoryMode: boolean,
): void {
  const cleanSearch = rawSearch.replace(/[-&|©]/g, " ");

  if (isCategoryMode) {
    const rawTerms = cleanSearch
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);

    let expandedTerms: string[] = [];
    let excludeTerms: string[] = [];

    rawTerms.forEach((word) => {
      const isPlural =
        word.endsWith("s") &&
        !["jeans", "pants", "shorts", "shoes", "dress", "sandals"].includes(
          word,
        );
      const singular = isPlural ? word.slice(0, -1) : word;

      expandedTerms.push(word);

      const mappedSynonyms = synonymMap[word] || synonymMap[singular];
      if (mappedSynonyms) expandedTerms.push(...mappedSynonyms.split(/\s+/));

      const mappedExcludes = excludeMap[word] || excludeMap[singular];
      if (mappedExcludes) excludeTerms.push(...mappedExcludes.split(/\s+/));
    });

    const uniqueTerms = Array.from(new Set(expandedTerms)).map((w) =>
      w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );

    if (uniqueTerms.length > 0) {
      const regexPattern = `\\b(${uniqueTerms.join("|")})\\b`;
      filter.$or = [
        { category: new RegExp(regexPattern, "i") },
        { name: new RegExp(regexPattern, "i") },
      ];
    }

    const uniqueExcludeTerms = Array.from(new Set(excludeTerms));
    if (uniqueExcludeTerms.length > 0) {
      const excludeRegex = new RegExp(
        `\\b(${uniqueExcludeTerms.join("|")})\\b`,
        "i",
      );
      filter.$and = filter.$and || [];
      filter.$and.push({ name: { $not: excludeRegex } });
      filter.$and.push({ category: { $not: excludeRegex } });
    }
  } else {
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
          !["jeans", "pants", "shorts", "shoes", "dress", "sandals"].includes(
            word,
          );
        const singular = isPlural ? word.slice(0, -1) : word;

        textSearchTerms.push(word);

        const mappedSynonyms = synonymMap[word] || synonymMap[singular];
        if (mappedSynonyms)
          textSearchTerms.push(...mappedSynonyms.split(/\s+/));

        const mappedExcludes = excludeMap[word] || excludeMap[singular];
        if (mappedExcludes) excludeTerms.push(...mappedExcludes.split(/\s+/));
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
        const excludeRegex = new RegExp(
          `\\b(${uniqueExcludeTerms.join("|")})\\b`,
          "i",
        );
        filter.$and = filter.$and || [];
        filter.$and.push({ name: { $not: excludeRegex } });
        filter.$and.push({ category: { $not: excludeRegex } });
      }
    }
  }
}

// ─── GET /api/products ────────────────────────────────────────────────────────
export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    const sortParam = req.query.sort as string | undefined;

    const baseFilter = buildBaseFilter(req.query);
    let filter: any = { ...baseFilter };

    const rawSearch = (
      (req.query.search as string) || (req.query.q as string)
    )?.trim();

    if (rawSearch) {
      applySearchFilter(filter, rawSearch, req.query.mode === "category");
    }

    const facetPipeline: any[] = [
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
            {
              $match: {
                color: {
                  $exists: true,
                  $nin: ["", "Default", "default", "DEFAULT", null],
                  $regex: /[a-zA-Z]/,
                  $not: /^\d{1,3}$/,
                },
              },
            },
            { $group: { _id: "$color", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 50 },
          ],
        },
      },
    ];

    if (sortParam === "discount") {
      const discountPipeline: any[] = [
        { $match: filter },
        {
          $addFields: {
            discountPct: {
              $cond: {
                if: {
                  $and: [
                    { $gt: ["$originalPrice", 0] },
                    { $gt: ["$originalPrice", "$price"] },
                  ],
                },
                then: {
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
                else: 0,
              },
            },
          },
        },
        { $sort: { discountPct: -1, timestamp: -1 } },
        {
          $project: {
            priceHistory: 0,
            description: 0,
            composition: 0,
            videos: 0,
          },
        },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: "count" }],
          },
        },
      ];

      const [discountResult, facetResult] = await Promise.all([
        ProductModel.aggregate(discountPipeline),
        ProductModel.aggregate(facetPipeline),
      ]);

      const products = discountResult[0]?.data || [];
      const total = discountResult[0]?.totalCount?.[0]?.count || 0;
      const [facet] = facetResult;

      return res.status(200).json({
        products,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        availableSizes: (facet?.sizes || []).map((s: any) => s._id),
        availableColors: (facet?.colors || []).map((c: any) => c._id),
      });
    }

    if (sortParam === "trending") {
      const trendingPipeline: any[] = [
        {
          $match: {
            $expr: { $gte: [{ $size: { $ifNull: ["$priceHistory", []] } }, 2] },
            images: { $exists: true, $not: { $size: 0 } },
            ...filter,
          },
        },
        {
          $addFields: {
            historySize: { $size: "$priceHistory" },
            firstPrice: { $arrayElemAt: ["$priceHistory.price", 0] },
            lastPrice: { $arrayElemAt: ["$priceHistory.price", -1] },
          },
        },
        {
          $addFields: {
            hasRealMovement: { $ne: ["$firstPrice", "$lastPrice"] },
          },
        },
        { $sort: { hasRealMovement: -1, historySize: -1, updatedAt: -1 } },
        {
          $project: {
            description: 0,
            composition: 0,
            videos: 0,
            firstPrice: 0,
            lastPrice: 0,
            historySize: 0,
            hasRealMovement: 0,
          },
        },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: "count" }],
          },
        },
      ];

      const [trendingResult, facetResult] = await Promise.all([
        ProductModel.aggregate(trendingPipeline),
        ProductModel.aggregate(facetPipeline),
      ]);

      let products = trendingResult[0]?.data || [];
      let total = trendingResult[0]?.totalCount?.[0]?.count || 0;

      if (products.length === 0) {
        const fallbackFilter = {
          images: { $exists: true, $not: { $size: 0 } },
          ...filter,
        };
        const [fallbackProducts, fallbackTotal] = await Promise.all([
          ProductModel.find(fallbackFilter, {
            description: 0,
            composition: 0,
            videos: 0,
          })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          ProductModel.countDocuments(fallbackFilter),
        ]);
        products = fallbackProducts;
        total = fallbackTotal;
      }

      const [facet] = facetResult;

      return res.status(200).json({
        products,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        availableSizes: (facet?.sizes || []).map((s: any) => s._id),
        availableColors: (facet?.colors || []).map((c: any) => c._id),
      });
    }

    let sortOption: any = {};

    if (sortParam === "lowest") {
      sortOption = { price: 1 };
    } else if (sortParam === "highest") {
      sortOption = { price: -1 };
    } else if (sortParam === "newest") {
      sortOption = { timestamp: -1 };
    } else if (filter.$text) {
      sortOption = { score: { $meta: "textScore" } };
    }

    if (Object.keys(sortOption).length === 0) {
      sortOption = { timestamp: -1 };
    }

    const standardPipeline: any[] = [
      { $match: filter },
      ...(filter.$text
        ? [{ $addFields: { score: { $meta: "textScore" } } }]
        : []),
      {
        $addFields: {
          histMin: {
            $min: {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ["$priceHistory", []] } }, 0] },
                then: "$priceHistory.price",
                else: ["$price"],
              },
            },
          },
          historyPreview: {
            $slice: [{ $ifNull: ["$priceHistory", []] }, -10],
          },
        },
      },
      { $sort: sortOption },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                priceHistory: 0,
                description: 0,
                composition: 0,
                videos: 0,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [standardResult, facetResult] = await Promise.all([
      ProductModel.aggregate(standardPipeline),
      ProductModel.aggregate(facetPipeline),
    ]);

    const allProducts = standardResult[0]?.data || [];
    const total = standardResult[0]?.totalCount?.[0]?.count || 0;
    const [facet] = facetResult;

    return res.status(200).json({
      products: allProducts,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      availableSizes: (facet?.sizes || []).map((s: any) => s._id),
      availableColors: (facet?.colors || []).map((c: any) => c._id),
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

// ─── DELETE /api/admin/products/:id ──────────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response) => {
  try {
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

// ─── GET /api/products/featured ──────────────────────────────────────────────
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

    // ── Helper: find one tile product by category regex ───────────────────────
    const tile = (regex: string) =>
      ProductModel.findOne({
        category: { $regex: regex, $options: "i" },
        images: { $exists: true, $not: { $size: 0 } },
        ...deptFilter,
      })
        .sort({ timestamp: -1 })
        .lean();

    const [
      onSaleRaw,
      newInRaw,
      withVideoRaw,
      campaignHeroesRaw,
      // ── 16 category tiles ─────────────────────────────────────────────────
      tCoats,
      tJackets,
      tSuits,
      tTops,
      tKnitwear,
      tJeans,
      tTrousers,
      tShorts,
      tDresses,
      tSkirts,
      tActivewear,
      tJumpsuits,
      tShoes,
      tBags,
      tAccessories,
      tJewelry,
    ] = await Promise.allSettled([
      // ── onSale ──────────────────────────────────────────────────────────────
      ProductModel.aggregate([
        {
          $match: {
            originalPrice: { $exists: true, $ne: null, $gt: 0 },
            $expr: { $gt: ["$originalPrice", "$price"] },
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
        { $sort: { discountPct: -1, timestamp: -1 } },
        { $limit: 12 },
      ]),

      // ── newIn ────────────────────────────────────────────────────────────────
      ProductModel.find({
        images: { $exists: true, $not: { $size: 0 } },
        ...deptFilter,
      })
        .sort({ timestamp: -1 })
        .limit(15)
        .lean(),

      // ── withVideo ────────────────────────────────────────────────────────────
      ProductModel.find(videoOmniQuery)
        .sort({ timestamp: -1 })
        .limit(20)
        .lean(),

      // ── campaignHeroes ───────────────────────────────────────────────────────
      ProductModel.find({ isCampaignHero: true, ...videoOmniQuery })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean(),

      // ── category tiles ───────────────────────────────────────────────────────
      tile("coat|overcoat|trench|parka|peacoat"),
      tile("jacket|bomber|puffer|windbreaker|anorak"),
      tile("suit|blazer|tuxedo|waistcoat|sportcoat"),
      tile("shirt|blouse|tee|t-shirt|camisole|tank|polo|overshirt"),
      tile("knit|sweater|jumper|cardigan|pullover"),
      tile("jean|denim"),
      tile("trouser|chino|slacks|cargo"),
      tile("short|bermuda"),
      tile("dress|gown"),
      tile("skirt|skort"),
      tile("activewear|legging|tracksuit|gym|training|sport"),
      tile("jumpsuit|playsuit|romper|overall"),
      tile("shoe|boot|sneaker|loafer|sandal|trainer"),
      tile("bag|tote|clutch|backpack|crossbody|handbag"),
      tile("belt|scarf|hat|cap|beanie|glove|sunglasses|wallet"),
      tile("jewelry|jewellery|necklace|earring|ring|bracelet|brooch"),
    ]);

    const getValue = (result: PromiseSettledResult<any>) =>
      result.status === "fulfilled" ? result.value : null;

    const rawVideoProducts: any[] = getValue(withVideoRaw) || [];
    const campaignHeroes: any[] = getValue(campaignHeroesRaw) || [];

    const withVideo = rawVideoProducts.filter(
      (p) =>
        !NON_CLOTHING_CATEGORY_RE.test(p.category || "") &&
        !NON_CLOTHING_CATEGORY_RE.test(p.name || ""),
    );

    return res.status(200).json({
      onSale: getValue(onSaleRaw) || [],
      newIn: getValue(newInRaw) || [],
      withVideo,
      campaignHeroes,
      categoryTiles: {
        coats: getValue(tCoats),
        jackets: getValue(tJackets),
        suits: getValue(tSuits),
        tops: getValue(tTops),
        knitwear: getValue(tKnitwear),
        jeans: getValue(tJeans),
        trousers: getValue(tTrousers),
        shorts: getValue(tShorts),
        dresses: getValue(tDresses),
        skirts: getValue(tSkirts),
        activewear: getValue(tActivewear),
        jumpsuits: getValue(tJumpsuits),
        shoes: getValue(tShoes),
        bags: getValue(tBags),
        accessories: getValue(tAccessories),
        jewelry: getValue(tJewelry),
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

    const products = await ProductModel.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" }, name: 1 },
    )
      .sort({ score: { $meta: "textScore" } })
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

// ─── GET /api/categories ──────────────────────────────────────────────────────
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

    const facetStages: Record<string, any[]> = {};
    potentialCategories.forEach((cat) => {
      facetStages[cat] = [
        {
          $match: {
            ...deptFilter,
            $or: [
              { name: { $regex: cat, $options: "i" } },
              { category: { $regex: cat, $options: "i" } },
            ],
          },
        },
        { $limit: 1 },
        { $count: "n" },
      ];
    });

    const [facetResult] = await ProductModel.aggregate([
      { $match: deptFilter },
      { $facet: facetStages },
    ]);

    const active: string[] = potentialCategories
      .filter((cat) => (facetResult?.[cat]?.[0]?.n ?? 0) > 0)
      .map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1) + "s");

    return res.status(200).json(active.sort());
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── DELETE /api/products/:id/media ──────────────────────────────────────────
export const deleteProductMedia = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { mediaUrls } = req.body;

    if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      res.status(400).json({ error: "No media URLs provided." });
      return;
    }

    const updatedProduct = await ProductModel.findOneAndUpdate(
      { id },
      { $pullAll: { images: mediaUrls, videos: mediaUrls } },
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

    const currentProduct = await ProductModel.findOne({ id }).lean();
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const searchString =
      `${currentProduct.name} ${currentProduct.category || ""}`.trim();

    let relatedProducts = await ProductModel.find(
      {
        $text: { $search: searchString },
        id: { $ne: id },
        department: currentProduct.department,
      },
      {
        score: { $meta: "textScore" },
        description: 0,
        priceHistory: 0,
      },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(4)
      .lean();

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

// ─── GET /api/products/trending ──────────────────────────────────────────────
export const getTrendingProducts = async (req: Request, res: Response) => {
  try {
    const deptFilter: any = {};
    if (req.query.departments) {
      const depts = (req.query.departments as string).split(",");
      const regexParts = depts.map((d) => {
        const upper = d.trim().toUpperCase();
        if (upper === "MAN" || upper === "MEN")
          return "\\b(man|men|mens|men's)\\b";
        return "\\b(woman|women|womens|women's)\\b";
      });
      deptFilter.department = {
        $regex: regexParts.join("|"),
        $options: "i",
      };
    }

    const results = await ProductModel.aggregate([
      {
        $match: {
          $expr: { $gte: [{ $size: { $ifNull: ["$priceHistory", []] } }, 2] },
          images: { $exists: true, $not: { $size: 0 } },
          ...deptFilter,
        },
      },
      {
        $addFields: {
          historySize: { $size: "$priceHistory" },
          firstPrice: { $arrayElemAt: ["$priceHistory.price", 0] },
          lastPrice: { $arrayElemAt: ["$priceHistory.price", -1] },
        },
      },
      {
        $addFields: {
          hasRealMovement: { $ne: ["$firstPrice", "$lastPrice"] },
        },
      },
      { $sort: { hasRealMovement: -1, historySize: -1, updatedAt: -1 } },
      { $limit: 12 },
      {
        $project: {
          description: 0,
          composition: 0,
          videos: 0,
          firstPrice: 0,
          lastPrice: 0,
          historySize: 0,
          hasRealMovement: 0,
        },
      },
    ]);

    if (results.length === 0) {
      const fallback = await ProductModel.find(
        { images: { $exists: true, $not: { $size: 0 } }, ...deptFilter },
        { description: 0, composition: 0, videos: 0 },
      )
        .sort({ updatedAt: -1 })
        .limit(12)
        .lean();
      return res.status(200).json(fallback);
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching trending products:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};
