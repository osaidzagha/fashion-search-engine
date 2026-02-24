export interface Product {
    name: string;
    price: number;
    currency: string;
    brand: string;
    imageUrl: string;
    link: string;
    timestamp: Date;
}

import { Page } from 'puppeteer';
export type ScraperFunction = (page: Page, url: string) => Promise<Product | null>;