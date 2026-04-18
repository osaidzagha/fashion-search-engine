import { Page } from "puppeteer";

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  brand: string;
  images: string[];
  link: string;
  timestamp: Date;
  description?: string;
  color?: string;
  composition?: string;
  category?: string;
  sizes?: string[];
  department: string;
  video?: string;

  // FIX: Properly typed as an array of objects
  priceHistory?: { price: number; date: Date }[];
}

export type ScraperFunction = (
  page: Page,
  url: string,
) => Promise<Product | null>;
