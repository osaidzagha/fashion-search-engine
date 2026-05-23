export type SubCategory =
  | { label: string; type: "search"; q: string; depts?: string[] }
  | { label: string; type: "sale"; q: string; depts?: string[] }
  | { label: string; type: "newest"; q: string; depts?: string[] }
  | { label: string; type: "brand"; q: string; depts?: string[] };

export interface TopCategory {
  label: string;
  key: string;
  items: SubCategory[];
}

// ─── Design rationale ────────────────────────────────────────────────────────
//
// Every query feeds into isCategoryMode in productController, which expands
// synonyms and applies excludeMap exclusions. The goal: each query should
// pull its own products and ONLY its own products. Categories that share root
// words (jacket / blazer, sweater / sweatpant) must rely on excludeMap to
// do the deduplication — so query strings here are kept as clean signals.
//
// Key rules applied:
//  • "overshirt"  → belongs to Tops, NOT Jackets
//  • "blazer"     → belongs to Suits, NOT Jackets
//  • "parka"      → belongs to Coats (long/heavy), NOT Jackets (short)
//  • "cardigan"   → Knitwear only; excluded from Jackets
//  • "jogger"/"sweatpant" → Pants, excluded from Knitwear (sweater)
//  • "tracksuit"  → Activewear, NOT Suits
// ─────────────────────────────────────────────────────────────────────────────

export const TAXONOMY: TopCategory[] = [
  {
    label: "Clothing",
    key: "clothing",
    items: [
      {
        label: "All Clothing",
        type: "search",
        // Broad signal — excludeMap handles deduplication
        q: "jacket coat dress blazer suit jacket jeans jumper sweater cardigan knitwear shirt blouse tee top skirt shorts pants trousers activewear jumpsuit nightwear hosiery",
      },

      // ── Outerwear ───────────────────────────────────────────────────────
      {
        label: "Coats",
        type: "search",
        // Long/heavy outer layer — parka goes here, NOT in Jackets
        q: "coat overcoat trench parka raincoat duster peacoat",
      },
      {
        label: "Jackets",
        type: "search",
        // Short, casual outerwear only. "overshirt" removed (→ Tops).
        // "blazer" removed (→ Suits). "parka" removed (→ Coats).
        // excludeMap["jacket"] will strip blazer/suit/tuxedo/waistcoat hits.
        q: "jacket bomber puffer windbreaker quilted anorak padded gilet vest",
      },
      {
        label: "Suits & Blazers",
        type: "search",
        // Formal tailoring — blazer explicitly lives here, not in Jackets.
        // excludeMap["suit"] already strips swimsuit/tracksuit/jumpsuit.
        q: "suit blazer tuxedo waistcoat tailoring sportcoat",
      },

      // ── Tops ────────────────────────────────────────────────────────────
      {
        label: "Tops",
        type: "search",
        // "overshirt" added here (it's a shirt-weight layer, not outerwear).
        // "polo" added; "blouse" kept.
        q: "top shirt blouse tee tshirt tank camisole tunic corset polo overshirt",
      },
      {
        label: "Knitwear",
        type: "search",
        // excludeMap["sweater"] already strips sweatpants/joggers.
        q: "sweater cardigan jumper pullover knitwear knit",
      },

      // ── Bottoms ──────────────────────────────────────────────────────────
      {
        label: "Pants",
        type: "search",
        // "jogger" and "sweatpant" go here, not in Knitwear.
        q: "pants trousers chino jogger sweatpant slacks cargo",
      },
      {
        label: "Jeans",
        type: "search",
        q: "jeans denim jegging",
      },
      {
        label: "Shorts",
        type: "search",
        q: "shorts bermuda", // Removed adjectives
      },
      {
        label: "Skirts",
        type: "search",
        q: "skirt skort", // FIXED: Removed "midi maxi mini"
        depts: ["WOMAN"], // Tagged for Women
      },

      // ── One-pieces ───────────────────────────────────────────────────────
      {
        label: "Dresses",
        type: "search",
        q: "dress gown", // FIXED: Removed "midi maxi mini"
        depts: ["WOMAN"], // Tagged for Women
      },
      {
        label: "Jumpsuits & Rompers",
        type: "search",
        q: "jumpsuit playsuit romper overall",
        depts: ["WOMAN"], // Tagged for Women
      },

      // ── Specialty ────────────────────────────────────────────────────────
      {
        label: "Activewear",
        type: "search",
        // excludeMap["suit"] strips "tracksuit" from Suits; we pick it up here.
        q: "activewear sport training running gym fitness legging tracksuit yoga",
      },
      {
        label: "Beachwear & Swimwear",
        type: "search",
        q: "swimsuit bikini boardshort swimwear trunks",
      },
      {
        label: "Lingerie",
        type: "search",
        q: "lingerie bra brief panty bralette thong", // Thong kept here
        depts: ["WOMAN"], // Tagged for Women
      },
      {
        label: "Nightwear & Sleepwear",
        type: "search",
        q: "nightwear sleepwear pajama pyjama robe nightgown",
      },
      {
        label: "Hosiery",
        type: "search",
        q: "tights socks hosiery",
      },

      // ── Browse shortcuts ──────────────────────────────────────────────────
      {
        label: "New Arrivals in Clothing",
        type: "newest",
        q: "jacket coat blazer suit dress shirt blouse knitwear sweater jeans pants trousers shorts skirt activewear top",
      },
      {
        label: "Clothing on Sale",
        type: "sale",
        q: "jacket coat blazer suit dress shirt blouse knitwear sweater jeans pants trousers shorts skirt activewear top",
      },
    ],
  },

  {
    label: "Shoes",
    key: "shoes",
    items: [
      {
        label: "All Shoes",
        type: "search",
        q: "shoe boot sneaker trainer sandal flat heel pump loafer moccasin stiletto oxford slipper mule espadrille",
      },
      {
        label: "Boots",
        type: "search",
        q: "boot chelsea chukka ankle booties wellington combat",
      },
      {
        label: "Sneakers & Trainers",
        type: "search",
        q: "sneaker trainer",
      },
      {
        label: "Flats",
        type: "search",
        q: "loafer moccasin ballerina mule slip-on espadrille flat",
      },
      {
        label: "Heels",
        type: "search",
        q: "heel pump stiletto wedge platform kitten",
        depts: ["WOMAN"], // Tagged for Women
      },
      {
        label: "Sandals",
        type: "search",
        q: "sandal slide flip-flop", // FIXED: Removed thong
      },
      {
        label: "New Arrivals in Shoes",
        type: "newest",
        q: "shoe boot sneaker trainer sandal flat heel pump loafer moccasin stiletto oxford slipper mule",
      },
      {
        label: "Shoes on Sale",
        type: "sale",
        q: "shoe boot sneaker trainer sandal flat heel pump loafer moccasin stiletto oxford slipper mule",
      },
    ],
  },

  {
    label: "Accessories",
    key: "accessories",
    items: [
      {
        label: "All Accessories",
        type: "search",
        q: "belt scarf hat cap beanie glove sunglasses wallet tie socks umbrella headband scrunchie",
      },
      { label: "Belts", type: "search", q: "belt suspender" },
      {
        label: "Hats",
        type: "search",
        q: "hat cap beanie fedora visor beret bucket-hat",
      },
      {
        label: "Scarves & Mufflers",
        type: "search",
        q: "scarf muffler foulard pashmina snood",
      },
      {
        label: "Sunglasses",
        type: "search",
        q: "sunglasses eyewear aviator",
      },
      {
        label: "Gloves",
        type: "search",
        q: "glove mitten",
      },
      {
        label: "Hair Accessories",
        type: "search",
        q: "headband scrunchie barrette hairpin",
        depts: ["WOMAN"], // Tagged for Women
      },
      {
        label: "Wallets & Cardholders",
        type: "search",
        q: "wallet cardholder coin purse",
      },
      { label: "Watches", type: "search", q: "watch timepiece chronograph" },
      { label: "Umbrellas", type: "search", q: "umbrella parasol" },
      {
        label: "New Arrivals in Accessories",
        type: "newest",
        q: "belt scarf hat cap beanie glove sunglasses wallet tie socks umbrella headband scrunchie",
      },
      {
        label: "Accessories on Sale",
        type: "sale",
        q: "belt scarf hat cap beanie glove sunglasses wallet tie socks umbrella headband scrunchie",
      },
    ],
  },

  {
    label: "Bags",
    key: "bags",
    items: [
      {
        label: "All Bags",
        type: "search",
        q: "bag backpack tote shopper clutch crossbody messenger hobo duffel suitcase satchel handbag",
      },
      {
        label: "Backpacks",
        type: "search",
        q: "backpack rucksack knapsack",
      },
      {
        label: "Tote & Shopper Bags",
        type: "search",
        q: "tote shopper",
      },
      {
        label: "Crossbody Bags",
        type: "search",
        q: "crossbody messenger",
      },
      {
        label: "Clutches & Evening Bags",
        type: "search",
        q: "clutch minaudiere pochette evening",
        depts: ["WOMAN"], // Tagged for Women
      },
      {
        label: "Shoulder Bags",
        type: "search",
        q: "shoulder handbag hobo",
      },
      {
        label: "Belt Bags",
        type: "search",
        q: "beltbag fannypack bumbag",
      },
      {
        label: "Briefcases & Work Bags",
        type: "search",
        q: "briefcase laptop document",
      },
      {
        label: "Luggage",
        type: "search",
        q: "luggage suitcase trolley",
      },
      {
        label: "New Arrivals in Bags",
        type: "newest",
        q: "bag backpack tote shopper clutch crossbody messenger hobo duffel suitcase satchel handbag",
      },
      {
        label: "Bags on Sale",
        type: "sale",
        q: "bag backpack tote shopper clutch crossbody messenger hobo duffel suitcase satchel handbag",
      },
    ],
  },

  {
    label: "Jewelry",
    key: "jewelry",
    items: [
      {
        label: "All Jewelry",
        type: "search",
        q: "jewelry ring necklace earring bracelet brooch pendant choker chain cuff",
      },
      {
        label: "Necklaces",
        type: "search",
        q: "necklace pendant choker chain lariat",
      },
      {
        label: "Earrings",
        type: "search",
        q: "earring stud hoop earcuff",
      },
      {
        label: "Bracelets",
        type: "search",
        q: "bracelet bangle cuff anklet",
      },
      {
        label: "Rings",
        type: "search",
        q: "ring signet band",
      },
      {
        label: "Brooches",
        type: "search",
        q: "brooch pin",
      },
      {
        label: "New Arrivals in Jewelry",
        type: "newest",
        q: "jewelry ring necklace earring bracelet brooch pendant choker",
      },
      {
        label: "Jewelry on Sale",
        type: "sale",
        q: "jewelry ring necklace earring bracelet brooch pendant choker",
      },
    ],
  },

  {
    label: "Brands",
    key: "brands",
    items: [
      { label: "Zara", type: "brand", q: "Zara" },
      { label: "Massimo Dutti", type: "brand", q: "Massimo Dutti" },
      { label: "Mango", type: "brand", q: "Mango" },
    ],
  },
];
