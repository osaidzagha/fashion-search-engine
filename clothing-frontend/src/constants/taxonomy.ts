export type SubCategory =
  | { label: string; type: "search"; q: string }
  | { label: string; type: "sale" }
  | { label: string; type: "newest" }
  | { label: string; type: "brand"; q: string };

export interface TopCategory {
  label: string;
  key: string;
  items: SubCategory[];
}

export const TAXONOMY: TopCategory[] = [
  {
    label: "Clothing",
    key: "clothing",
    items: [
      {
        label: "All Clothing",
        type: "search",
        // Removed dangerous adjectives like 'knit', 'denim', 'active'
        q: "",
      },
      {
        label: "Beachwear & Swimwear",
        type: "search",
        q: "swimsuit bikini boardshort swimwear trunks", // Removed 'swim' and 'surf' (verbs)
      },
      { label: "Coats", type: "search", q: "coat trench parka overcoat" },
      { label: "Dresses", type: "search", q: "dress gown" },
      { label: "Hosiery", type: "search", q: "tights socks hosiery" },
      {
        label: "Jackets",
        type: "search",
        q: "jacket blazer bomber puffer waistcoat overshirt", // Removed 'waist'
      },
      { label: "Jeans", type: "search", q: "jeans jegging" }, // Removed 'denim'
      {
        label: "Jumpsuits & Rompers",
        type: "search",
        q: "jumpsuit playsuit romper overall",
      },
      {
        label: "Knitwear",
        type: "search",
        q: "sweater cardigan jumper pullover knitwear", // Removed 'knit'
      },
      {
        label: "Lingerie",
        type: "search",
        q: "lingerie bra brief panty bralette thong",
      },
      {
        label: "Nightwear & Sleepwear",
        type: "search",
        q: "nightwear sleepwear pajama pyjama robe nightgown",
      },
      {
        label: "Pants",
        type: "search",
        q: "pants trousers chino jogger sweatpant",
      },
      { label: "Shorts", type: "search", q: "shorts bermuda" },
      { label: "Skirts", type: "search", q: "skirt skort" }, // Removed 'midi maxi mini'
      { label: "Suits", type: "search", q: "suit tuxedo blazer waistcoat" }, // Removed 'tailoring'
      {
        label: "Activewear",
        type: "search",
        q: "activewear sport",
      },
      {
        label: "Tops",
        type: "search",
        q: "top shirt blouse t-shirt polo tank tunic camisole",
      },
      { label: "New Arrivals in Clothing", type: "newest" },
      { label: "Clothing on Sale", type: "sale" },
    ],
  },
  {
    label: "Shoes",
    key: "shoes",
    items: [
      {
        label: "All Shoes",
        type: "search",
        q: "shoe boot sneaker trainer sandal flat heel pump loafer moccasin stiletto oxford slipper mule",
      },
      {
        label: "Boots",
        type: "search",
        q: "boot boots chelsea chukka booties wellington",
      },
      {
        label: "Flats",
        type: "search",
        q: "loafer moccasin ballerina mule slip-on",
      }, // Removed 'flat' as it can be an adjective
      {
        label: "Heels",
        type: "search",
        q: "heel pump stiletto wedge platform",
      },
      { label: "Sneakers", type: "search", q: "sneaker trainer" }, // Removed 'runner' (table runner)
      { label: "New Arrivals in Shoes", type: "newest" },
      { label: "Shoes on Sale", type: "sale" },
    ],
  },
  {
    label: "Accessories",
    key: "accessories",
    items: [
      {
        label: "All Accessories",
        type: "search",
        q: "accessory belt scarf hat cap beanie glove sunglasses eyewear wallet purse cardholder tie socks umbrella watch headband scrunchie",
      },
      { label: "Belts", type: "search", q: "belt suspender" },
      {
        label: "Phone Cases",
        type: "search",
        q: "phonecase iphone smartphone",
      }, // Removed 'case cover'
      { label: "Face Masks", type: "search", q: "facemask mask" }, // Removed 'face'
      { label: "Gloves", type: "search", q: "glove mitten" },
      {
        label: "Hair Accessories",
        type: "search",
        q: "headband scrunchie barrette hairpin", // Removed 'hair clip'
      },
      { label: "Hats", type: "search", q: "hat cap beanie fedora visor beret" },
      {
        label: "Scarves & Mufflers",
        type: "search",
        q: "scarf muffler foulard pashmina snood",
      },
      { label: "Sunglasses", type: "search", q: "sunglasses eyewear aviator" }, // Removed 'glasses'
      { label: "Umbrellas", type: "search", q: "umbrella parasol" },
      {
        label: "Wallets & Cardholders",
        type: "search",
        q: "wallet cardholder purse coin",
      },
      { label: "Watches", type: "search", q: "watch timepiece chronograph" },
      { label: "New Arrivals in Accessories", type: "newest" },
      { label: "Accessories on Sale", type: "sale" },
    ],
  },
  {
    label: "Bags",
    key: "bags",
    items: [
      {
        label: "All Bags",
        type: "search",
        q: "bag backpack rucksack tote shopper clutch crossbody messenger hobo duffel suitcase luggage satchel handbag",
      },
      { label: "Backpacks", type: "search", q: "backpack rucksack knapsack" },
      { label: "Bag Accessories", type: "search", q: "bagstrap bagcharm" }, // Isolated to avoid dress straps
      { label: "Beach Bags", type: "search", q: "beachbag basketbag" }, // Removed 'straw basket'
      { label: "Belt Bags", type: "search", q: "fannypack bumbag" }, // Removed 'belt waist bag'
      {
        label: "Briefcases & Work Bags",
        type: "search",
        q: "briefcase laptop document", // Removed 'work'
      },
      { label: "Bucket Bags", type: "search", q: "bucketbag bucket" },
      {
        label: "Clutches & Evening Bags",
        type: "search",
        q: "clutch minaudiere pochette", // Removed 'evening'
      },
      { label: "Crossbody Bags", type: "search", q: "crossbody messenger" },
      { label: "Hobo Bags", type: "search", q: "hobo" },
      {
        label: "Duffel & Weekend Bags",
        type: "search",
        q: "duffel weekender holdall", // Removed 'travel'
      },
      { label: "Luggage", type: "search", q: "luggage suitcase trolley trunk" }, // Removed 'cabin'
      {
        label: "Makeup & Cosmetic Cases",
        type: "search",
        q: "cosmetic toiletry vanity", // Removed 'makeup wash'
      },
      { label: "Satchel Bags", type: "search", q: "satchel" },
      { label: "Shoulder Bags", type: "search", q: "shoulderbag shoulder" },
      { label: "Top-handle Bags", type: "search", q: "tophandle bowler" }, // Lethal trap removed: 'top handle'
      { label: "Tote Bags", type: "search", q: "tote shopper" },
      { label: "New Arrivals in Bags", type: "newest" },
      { label: "Bags on Sale", type: "sale" },
    ],
  },
  {
    label: "Jewelry",
    key: "jewelry",
    items: [
      {
        label: "All Jewelry",
        type: "search",
        q: "jewelry ring necklace earring bracelet brooch pin cuff pendant choker",
      },
      { label: "Bracelets", type: "search", q: "bracelet bangle cuff anklet" },
      { label: "Brooches", type: "search", q: "brooch pin" },
      { label: "Earrings", type: "search", q: "earring stud hoop earcuff" },
      {
        label: "Necklaces",
        type: "search",
        q: "necklace pendant choker chain lariat",
      },
      { label: "Rings", type: "search", q: "ring signet band" },
      { label: "New Arrivals in Jewelry", type: "newest" },
      { label: "Jewelry on Sale", type: "sale" },
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
