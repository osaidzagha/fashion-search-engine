export type SubCategory =
  | { label: string; type: "search"; q: string }
  | { label: string; type: "sale"; q: string } // 👈 FIX: Added q
  | { label: string; type: "newest"; q: string } // 👈 FIX: Added q
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
        q: "coat dress hosiery jacket jeans jumpsuit sweater lingerie nightwear pants shorts skirt suit activewear top shirt",
      },
      {
        label: "Beachwear & Swimwear",
        type: "search",
        q: "swimsuit bikini boardshort swimwear trunks",
      },
      { label: "Coats", type: "search", q: "coat trench parka overcoat" },
      { label: "Dresses", type: "search", q: "dress gown" },
      { label: "Hosiery", type: "search", q: "tights socks hosiery" },
      {
        label: "Jackets",
        type: "search",
        q: "jacket bomber puffer overshirt",
      },
      { label: "Jeans", type: "search", q: "jeans jegging" },
      {
        label: "Jumpsuits & Rompers",
        type: "search",
        q: "jumpsuit playsuit romper overall",
      },
      {
        label: "Knitwear",
        type: "search",
        q: "sweater cardigan jumper pullover knitwear",
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
      { label: "Skirts", type: "search", q: "skirt skort" },
      { label: "Suits", type: "search", q: "suit tuxedo blazer waistcoat" },
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
      // 👇 FIX: Added q parameter to keep sale/newest scoped to clothing
      {
        label: "New Arrivals in Clothing",
        type: "newest",
        q: "coat dress hosiery jacket jeans jumpsuit sweater lingerie nightwear pants shorts skirt suit activewear top shirt",
      },
      {
        label: "Clothing on Sale",
        type: "sale",
        q: "coat dress hosiery jacket jeans jumpsuit sweater lingerie nightwear pants shorts skirt suit activewear top shirt",
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
      },
      {
        label: "Heels",
        type: "search",
        q: "heel pump stiletto wedge platform",
      },
      { label: "Sneakers", type: "search", q: "sneaker trainer" },
      // 👇 FIX: Added q parameter
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
        q: "accessory belt scarf hat cap beanie glove sunglasses eyewear wallet purse cardholder tie socks umbrella watch headband scrunchie",
      },
      { label: "Belts", type: "search", q: "belt suspender" },
      {
        label: "Phone Cases",
        type: "search",
        q: "phonecase iphone smartphone",
      },
      { label: "Face Masks", type: "search", q: "facemask mask" },
      { label: "Gloves", type: "search", q: "glove mitten" },
      {
        label: "Hair Accessories",
        type: "search",
        q: "headband scrunchie barrette hairpin",
      },
      { label: "Hats", type: "search", q: "hat cap beanie fedora visor beret" },
      {
        label: "Scarves & Mufflers",
        type: "search",
        q: "scarf muffler foulard pashmina snood",
      },
      { label: "Sunglasses", type: "search", q: "sunglasses eyewear aviator" },
      { label: "Umbrellas", type: "search", q: "umbrella parasol" },
      {
        label: "Wallets & Cardholders",
        type: "search",
        q: "wallet cardholder purse coin",
      },
      { label: "Watches", type: "search", q: "watch timepiece chronograph" },
      // 👇 FIX: Added q parameter
      {
        label: "New Arrivals in Accessories",
        type: "newest",
        q: "accessory belt scarf hat cap beanie glove sunglasses eyewear wallet purse cardholder tie socks umbrella watch headband scrunchie",
      },
      {
        label: "Accessories on Sale",
        type: "sale",
        q: "accessory belt scarf hat cap beanie glove sunglasses eyewear wallet purse cardholder tie socks umbrella watch headband scrunchie",
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
        q: "bag backpack rucksack tote shopper clutch crossbody messenger hobo duffel suitcase luggage satchel handbag",
      },
      { label: "Backpacks", type: "search", q: "backpack rucksack knapsack" },
      { label: "Bag Accessories", type: "search", q: "bagstrap bagcharm" },
      { label: "Beach Bags", type: "search", q: "beachbag basketbag" },
      { label: "Belt Bags", type: "search", q: "fannypack bumbag" },
      {
        label: "Briefcases & Work Bags",
        type: "search",
        q: "briefcase laptop document",
      },
      { label: "Bucket Bags", type: "search", q: "bucketbag bucket" },
      {
        label: "Clutches & Evening Bags",
        type: "search",
        q: "clutch minaudiere pochette",
      },
      { label: "Crossbody Bags", type: "search", q: "crossbody messenger" },
      { label: "Hobo Bags", type: "search", q: "hobo" },
      {
        label: "Duffel & Weekend Bags",
        type: "search",
        q: "duffel weekender holdall",
      },
      { label: "Luggage", type: "search", q: "luggage suitcase trolley trunk" },
      {
        label: "Makeup & Cosmetic Cases",
        type: "search",
        q: "cosmetic toiletry vanity",
      },
      { label: "Satchel Bags", type: "search", q: "satchel" },
      { label: "Shoulder Bags", type: "search", q: "shoulderbag shoulder" },
      { label: "Top-handle Bags", type: "search", q: "tophandle bowler" },
      { label: "Tote Bags", type: "search", q: "tote shopper" },
      // 👇 FIX: Added q parameter
      {
        label: "New Arrivals in Bags",
        type: "newest",
        q: "bag backpack rucksack tote shopper clutch crossbody messenger hobo duffel suitcase luggage satchel handbag",
      },
      {
        label: "Bags on Sale",
        type: "sale",
        q: "bag backpack rucksack tote shopper clutch crossbody messenger hobo duffel suitcase luggage satchel handbag",
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
      // 👇 FIX: Added q parameter
      {
        label: "New Arrivals in Jewelry",
        type: "newest",
        q: "jewelry ring necklace earring bracelet brooch pin cuff pendant choker",
      },
      {
        label: "Jewelry on Sale",
        type: "sale",
        q: "jewelry ring necklace earring bracelet brooch pin cuff pendant choker",
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
