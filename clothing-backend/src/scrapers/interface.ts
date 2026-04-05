export interface Product {
  id: string;
  name: string;
  price: number;
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
}

import { Page } from "puppeteer";
export type ScraperFunction = (
  page: Page,
  url: string,
) => Promise<Product | null>;
