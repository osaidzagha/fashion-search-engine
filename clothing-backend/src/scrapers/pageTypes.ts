import type { Page } from "puppeteer";

// Branded page type that carries the intercept mode flag.
// Use this everywhere instead of bare `Page`.
export type InterceptPage = Page & {
  __interceptMode: "restrictive" | "permissive";
};

export function setMode(
  page: InterceptPage,
  mode: "restrictive" | "permissive",
): void {
  page.__interceptMode = mode;
}

// Cast a raw puppeteer Page into an InterceptPage and set default mode.
// Called ONCE inside setupPage — nowhere else.
export function asInterceptPage(page: Page): InterceptPage {
  const p = page as InterceptPage;
  p.__interceptMode = "restrictive";
  return p;
}
