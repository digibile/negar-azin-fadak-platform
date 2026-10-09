export type DigikalaCatalogProduct = {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  category: string;
  price: string;
  currency: "IRR";
  seller_name: "دیجی‌کالا · منبع اصلی";
  store_id: null;
  image_url: string;
  source_url: string;
  source_name: "دیجی‌کالا";
  source_type: "external-reference";
  brand: string | null;
  rating: number | null;
};

type UnknownRecord = Record<string, unknown>;

const SEARCHES = [
  { query: "گوشی موبایل", category: "موبایل و تبلت" },
  { query: "لپ تاپ کامپیوتر", category: "لپ‌تاپ و کامپیوتر" },
  { query: "لوازم خانه آشپزخانه", category: "خانه و آشپزخانه" },
  { query: "کفش پوشاک", category: "مد و پوشاک" },
  { query: "لوازم آرایشی بهداشتی", category: "زیبایی و سلامت" },
  { query: "هدفون اسپیکر تلویزیون", category: "صوتی و تصویری" },
  { query: "لوازم ورزشی سفر", category: "ورزش و سفر" },
  { query: "کتاب لوازم التحریر", category: "کتاب و لوازم‌التحریر" },
  { query: "لوازم کودک نوزاد", category: "کودک و نوزاد" },
  { query: "لوازم خودرو ابزار", category: "خودرو و ابزار" },
  { query: "سوپرمارکت مواد غذایی", category: "سوپرمارکت" },
  { query: "لوازم اداری", category: "لوازم اداری" }
] as const;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function at(value: unknown, ...keys: string[]): unknown {
  let current: unknown = value;
  for (const key of keys) current = record(current)[key];
  return current;
}

function textValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function numericValue(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }
  return null;
}

function imageValue(product: UnknownRecord): string | null {
  const candidates = [
    at(product, "images", "main", "url"),
    at(product, "images", "main", "urls"),
    at(product, "image", "url"),
    product.image_url,
    product.image
  ];
  for (const candidate of candidates) {
    const url = Array.isArray(candidate) ? candidate.find(item => typeof item === "string") : candidate;
    if (typeof url === "string" && /^https:\/\//i.test(url)) return url;
  }
  return null;
}

function productUrl(product: UnknownRecord, id: string): string {
  const value = textValue(product.url) || textValue(product.product_url);
  if (value && /^https:\/\//i.test(value)) return value;
  if (value && value.startsWith("/")) return "https://www.digikala.com" + value;
  return "https://www.digikala.com/product/dkp-" + encodeURIComponent(id) + "/";
}

export function normalizeDigikalaProducts(payload: unknown, fallbackCategory: string): DigikalaCatalogProduct[] {
  const data = record(record(payload).data);
  const rawProducts = Array.isArray(data.products)
    ? data.products
    : Array.isArray(at(data, "products", "items"))
      ? at(data, "products", "items") as unknown[]
      : [];
  const normalized: DigikalaCatalogProduct[] = [];
  for (const raw of rawProducts) {
    const product = record(raw);
    const rawId = product.id ?? product.product_id ?? product.productId;
    const id = rawId === undefined || rawId === null ? "" : String(rawId).trim();
    const title = textValue(product.title_fa) || textValue(product.title) || textValue(product.name);
    const image = imageValue(product);
    const price = numericValue(
      at(product, "default_variant", "price", "selling_price"),
      at(product, "default_variant", "price", "sellingPrice"),
      at(product, "price", "selling_price"),
      at(product, "price", "sellingPrice"),
      product.selling_price
    );
    if (!id || !title || !image || !price) continue;
    const category = textValue(at(product, "category", "title_fa"))
      || textValue(at(product, "category", "name"))
      || fallbackCategory;
    const brand = textValue(at(product, "brand", "title_fa")) || textValue(at(product, "brand", "name"));
    const description = textValue(product.short_description)
      || textValue(product.description)
      || textValue(product.summary);
    const rawRating = at(product, "rating", "rate") ?? at(product, "rating", "average") ?? product.rating;
    const ratingNumber = typeof rawRating === "number" ? rawRating : typeof rawRating === "string" ? Number(rawRating) : NaN;
    normalized.push({
      id: "digikala-" + id,
      sku: "DK-" + id,
      title,
      description,
      category,
      price: String(price),
      currency: "IRR",
      seller_name: "دیجی‌کالا · منبع اصلی",
      store_id: null,
      image_url: image,
      source_url: productUrl(product, id),
      source_name: "دیجی‌کالا",
      source_type: "external-reference",
      brand,
      rating: Number.isFinite(ratingNumber) && ratingNumber > 0 && ratingNumber <= 5 ? ratingNumber : null
    });
  }
  return normalized;
}

let cachedProducts: DigikalaCatalogProduct[] = [];
let cachedAt = 0;
let inFlight: Promise<DigikalaCatalogProduct[]> | null = null;
const CACHE_MS = 20 * 60 * 1000;

async function fetchSearch(query: string, category: string): Promise<DigikalaCatalogProduct[]> {
  const url = new URL("/v1/search/", "https://api.digikala.com");
  url.searchParams.set("q", query);
  url.searchParams.set("page", "1");
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "SookarCatalogReference/1.0 (+https://sookar.ir)"
    },
    signal: AbortSignal.timeout(6500)
  });
  if (!response.ok) throw new Error("Digikala source returned HTTP " + response.status);
  return normalizeDigikalaProducts(await response.json(), category);
}

async function loadCatalog(): Promise<DigikalaCatalogProduct[]> {
  const results = await Promise.allSettled(
    SEARCHES.map(item => fetchSearch(item.query, item.category))
  );
  const unique = new Map<string, DigikalaCatalogProduct>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const product of result.value) {
      if (!unique.has(product.id)) unique.set(product.id, product);
      if (unique.size >= 250) break;
    }
    if (unique.size >= 250) break;
  }
  return [...unique.values()].slice(0, 250);
}

export async function getDigikalaCatalog(): Promise<{ products: DigikalaCatalogProduct[]; sourceStatus: "live" | "unavailable"; fetchedAt: string | null }> {
  if (Date.now() - cachedAt < CACHE_MS) {
    return { products: cachedProducts, sourceStatus: cachedProducts.length ? "live" : "unavailable", fetchedAt: cachedAt ? new Date(cachedAt).toISOString() : null };
  }
  if (!inFlight) {
    inFlight = loadCatalog()
      .then(products => {
        cachedProducts = products;
        cachedAt = Date.now();
        return products;
      })
      .catch(() => {
        cachedProducts = [];
        cachedAt = Date.now();
        return cachedProducts;
      })
      .finally(() => { inFlight = null; });
  }
  const products = await inFlight;
  return { products, sourceStatus: products.length ? "live" : "unavailable", fetchedAt: cachedAt ? new Date(cachedAt).toISOString() : null };
}
