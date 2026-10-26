import "server-only";
import type { Category, Paginated, Product, ProductSummary, Wilaya } from "./types";

/**
 * Calls from Next.js server components straight to the Symfony API
 * (inside Docker: http://api:8000). Never runs in the browser.
 */
const API_URL = process.env.API_URL ?? "http://localhost:8000";

export class NotFoundError extends Error {}

async function get<T>(path: string, revalidateSeconds = 30): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: revalidateSeconds },
  });
  if (response.status === 404) throw new NotFoundError(path);
  if (!response.ok) throw new Error(`API ${response.status} on ${path}`);
  return (await response.json()) as T;
}

export function fetchCategories(): Promise<Category[]> {
  return get<Category[]>("/api/categories", 300);
}

export function fetchProducts(params: {
  category?: string;
  q?: string;
  sort?: string;
  page?: number;
}): Promise<Paginated<ProductSummary>> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.q) query.set("q", params.q);
  if (params.sort) query.set("sort", params.sort);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return get<Paginated<ProductSummary>>(`/api/products${qs ? `?${qs}` : ""}`);
}

export function fetchProduct(slug: string): Promise<Product> {
  // Stock changes with every order: never cache the product page for long.
  return get<Product>(`/api/products/${encodeURIComponent(slug)}`, 5);
}

export function fetchWilayas(): Promise<Wilaya[]> {
  return get<Wilaya[]>("/api/wilayas", 300);
}
