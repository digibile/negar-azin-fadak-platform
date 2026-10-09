export type DigikalaCatalogProduct = {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  category: string;
  price: string | null;
  currency: "IRR";
  seller_name: "دیجی‌کالا · منبع اصلی";
  store_id: null;
  image_url: string;
  source_url: string;
  source_name: "دیجی‌کالا";
  source_type: "external-reference";
  brand: string | null;
  rating: number | null;
  source_available: boolean | null;
  specifications: Array<{ group: string; items: Array<{ name: string; values: string[] }> }>;
  gallery_images: string[];
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

function normalizedSpecifications(product: UnknownRecord): Array<{ group: string; items: Array<{ name: string; values: string[] }> }> {
  const raw = product.specifications ?? product.specs ?? product.product_specifications;
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const groupRecord = record(entry);
    const group = textValue(groupRecord.title) || textValue(groupRecord.name) || textValue(groupRecord.title_fa) || "مشخصات";
    const rawItems = groupRecord.attributes ?? groupRecord.items ?? groupRecord.specifications;
    if (!Array.isArray(rawItems)) return null;
    const items = rawItems.map((rawItem) => {
      const item = record(rawItem);
      const name = textValue(item.title) || textValue(item.name) || textValue(item.title_fa) || textValue(item.label);
      const rawValues = item.values ?? item.value ?? item.values_fa;
      const values = (Array.isArray(rawValues) ? rawValues : [rawValues])
        .map((value) => typeof value === "string" || typeof value === "number" ? String(value).trim() : textValue(record(value).title) || textValue(record(value).value) || "")
        .filter(Boolean)
        .slice(0, 20);
      return name && values.length ? { name, values } : null;
    }).filter((item): item is { name: string; values: string[] } => item !== null);
    return items.length ? { group, items } : null;
  }).filter((group): group is { group: string; items: Array<{ name: string; values: string[] }> } => group !== null).slice(0, 30);
}

function galleryImages(product: UnknownRecord, primary: string): string[] {
  const images = record(product.images);
  const candidates: unknown[] = [
    images.gallery,
    images.list,
    images.items,
    product.gallery_images,
    product.images_list
  ];
  const urls = [primary];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    for (const value of candidate) {
      const item = record(value);
      const possible = typeof value === "string" ? value : textValue(item.url) || textValue(item.src) || textValue(item.image_url);
      if (possible && /^https:\/\//i.test(possible) && !urls.includes(possible)) urls.push(possible);
      if (urls.length >= 12) return urls;
    }
  }
  return urls;
}

export function normalizeDigikalaProducts(payload: unknown, fallbackCategory: string): DigikalaCatalogProduct[] {
  const data = record(record(payload).data);
  const rawProducts = Array.isArray(data.products)
    ? data.products
    : Array.isArray(at(data, "products", "items"))
      ? at(data, "products", "items") as unknown[]
      : record(data.product).id !== undefined
        ? [data.product]
        : record(data).id !== undefined
          ? [data]
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
    if (!id || !title || !image) continue;
    const category = textValue(at(product, "category", "title_fa"))
      || textValue(at(product, "category", "name"))
      || fallbackCategory;
    const brand = textValue(at(product, "brand", "title_fa")) || textValue(at(product, "brand", "name"));
    const description = textValue(product.short_description)
      || textValue(product.description)
      || textValue(product.summary);
    const rawRating = at(product, "rating", "rate") ?? at(product, "rating", "average") ?? product.rating;
    const variant = record(product.default_variant);
    const rawAvailability = variant.is_available ?? variant.isAvailable;
    const status = variant.status ?? product.status;
    const soldOut = variant.is_sold_out ?? variant.isSoldOut;
    const sourceAvailable = typeof rawAvailability === "boolean"
      ? rawAvailability
      : typeof soldOut === "boolean"
        ? !soldOut
        : status === "marketable"
          ? true
          : status === "unavailable" || status === "sold_out"
            ? false
            : typeof product.is_available === "boolean" ? product.is_available : null;
    if (price === null && sourceAvailable !== false) continue;
    const ratingNumber = typeof rawRating === "number" ? rawRating : typeof rawRating === "string" ? Number(rawRating) : NaN;
    normalized.push({
      id: "digikala-" + id,
      sku: "DK-" + id,
      title,
      description,
      category,
      price: price === null ? null : String(price),
      currency: "IRR",
      seller_name: "دیجی‌کالا · منبع اصلی",
      store_id: null,
      image_url: image,
      source_url: productUrl(product, id),
      source_name: "دیجی‌کالا",
      source_type: "external-reference",
      brand,
      rating: Number.isFinite(ratingNumber) && ratingNumber > 0 && ratingNumber <= 5 ? ratingNumber : null,
      source_available: sourceAvailable,
      specifications: normalizedSpecifications(product),
      gallery_images: galleryImages(product, image)
    });
  }
  return normalized;
}

export function parseDigikalaCategoryReference(input: string): string {
  const value = input.trim();
  if (!value) throw new Error("لینک یا شناسه دسته‌بندی را وارد کنید.");
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host !== "digikala.com" && host !== "www.digikala.com") throw new Error("فقط لینک دسته‌بندی از دامنه رسمی دیجی‌کالا پذیرفته می‌شود.");
    const match = url.pathname.match(/(?:^|\/)category-([a-z0-9-]+)(?:\/|$)/i)
      || url.pathname.match(/\/categories\/([a-z0-9-]+)(?:\/|$)/i);
    if (!match) throw new Error("از لینک ارسالی شناسه دسته‌بندی قابل استخراج نیست؛ لینک صفحه دسته‌بندی را وارد کنید.");
    return match[1].toLowerCase();
  }
  const slug = value.replace(/^category-/i, "").replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) throw new Error("شناسه دسته‌بندی معتبر نیست.");
  return slug;
}

export async function getDigikalaCategoryProducts(input: string, maxProducts = 50): Promise<{ category: string; products: DigikalaCatalogProduct[]; fetchedAt: string }> {
  const slug = parseDigikalaCategoryReference(input);
  const limit = Math.max(1, Math.min(50, Math.floor(maxProducts)));
  const pageUrl = (page: number) => {
    const url = new URL("/v1/categories/" + encodeURIComponent(slug) + "/search/", "https://api.digikala.com");
    url.searchParams.set("page", String(page));
    return url;
  };
  const fetchPage = async (page: number): Promise<{ payload: unknown; totalPages: number }> => {
    const response = await fetch(pageUrl(page), {
      headers: {
        accept: "application/json, text/plain, */*",
        referer: "https://www.digikala.com/",
        "x-web-client-id": "web",
        "x-web-client": "desktop",
        "x-web-optimize-response": "1",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error("دریافت دسته‌بندی مرجع با خطای HTTP " + response.status + " روبه‌رو شد.");
    const payload: unknown = await response.json();
    const totalPagesValue = at(payload, "data", "pager", "total_pages");
    const totalPages = typeof totalPagesValue === "number" && Number.isFinite(totalPagesValue) ? Math.max(1, totalPagesValue) : 1;
    return { payload, totalPages };
  };
  const first = await fetchPage(1);
  const pageCount = Math.min(3, first.totalPages, Math.ceil(limit / 20));
  const remaining = await Promise.allSettled(Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => fetchPage(index + 2)));
  const payloads = [first.payload, ...remaining.filter((result): result is PromiseFulfilledResult<{ payload: unknown; totalPages: number }> => result.status === "fulfilled").map(result => result.value.payload)];
  const products = new Map<string, DigikalaCatalogProduct>();
  for (const payload of payloads) {
    for (const product of normalizeDigikalaProducts(payload, slug.replace(/-/g, " "))) {
      if (!products.has(product.id) && product.price !== null) products.set(product.id, product);
      if (products.size >= limit) break;
    }
    if (products.size >= limit) break;
  }
  return { category: slug, products: [...products.values()].slice(0, limit), fetchedAt: new Date().toISOString() };
}

export async function getDigikalaProductById(input: string): Promise<DigikalaCatalogProduct> {
  const id = input.trim().replace(/^dkp-/i, "");
  if (!/^\d{1,16}$/.test(id)) throw new Error("شناسه محصول دیجی‌کالا باید عددی باشد.");
  const response = await fetch(new URL("/v2/product/" + encodeURIComponent(id) + "/", "https://api.digikala.com"), {
    headers: {
      accept: "application/json, text/plain, */*",
      referer: "https://www.digikala.com/",
      "x-web-client-id": "web",
      "x-web-client": "desktop",
      "x-web-optimize-response": "1",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error("دریافت محصول از دیجی‌کالا با خطای HTTP " + response.status + " روبه‌رو شد.");
  const payload = await response.json();
  const product = normalizeDigikalaProducts(payload, "سایر کالاها").find(item => item.id === "digikala-" + id);
  if (!product || product.price === null) throw new Error("برای این شناسه، محصول دارای عنوان، تصویر و قیمت معتبر پیدا نشد.");
  return product;
}

let cachedProducts: DigikalaCatalogProduct[] = [];
let cachedAt = 0;
let lastAttemptAt = 0;
let lastFetchSucceeded = false;
let inFlight: Promise<DigikalaCatalogProduct[]> | null = null;
const CACHE_MS = 5 * 60 * 1000;

async function fetchSearch(query: string, category: string, page = 1): Promise<DigikalaCatalogProduct[]> {
  const url = new URL("/v1/search/", "https://api.digikala.com");
  url.searchParams.set("q", query);
  url.searchParams.set("page", String(page));
  const response = await fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      referer: "https://www.digikala.com/",
      "x-web-client-id": "web",
      "x-web-client": "desktop",
      "x-web-optimize-response": "1",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
    },
    signal: AbortSignal.timeout(6500)
  });
  if (!response.ok) throw new Error("Digikala source returned HTTP " + response.status);
  return normalizeDigikalaProducts(await response.json(), category);
}

async function loadCatalog(): Promise<DigikalaCatalogProduct[]> {
  const unique = new Map<string, DigikalaCatalogProduct>();
  for (let start = 0; start < SEARCHES.length && unique.size < 250; start += 3) {
    const batch = await Promise.allSettled(SEARCHES.slice(start, start + 3).map(item => fetchSearch(item.query, item.category, 1)));
    for (const result of batch) if (result.status === "fulfilled") {
      for (const product of result.value) {
        if (!unique.has(product.id)) unique.set(product.id, product);
        if (unique.size >= 250) break;
      }
    }
    if (start + 3 < SEARCHES.length && unique.size < 250) await new Promise(resolve => setTimeout(resolve, 350));
  }
  return [...unique.values()].slice(0, 250);
}

export async function getDigikalaCatalog(forceRefresh = false): Promise<{ products: DigikalaCatalogProduct[]; categories: string[]; sourceStatus: "live" | "unavailable"; fetchedAt: string | null }> {
  if (forceRefresh) lastAttemptAt = 0;
  if (!forceRefresh && lastAttemptAt > 0 && Date.now() - lastAttemptAt < CACHE_MS) {
    return { products: cachedProducts, categories: [...new Set(SEARCHES.map(item => item.category))], sourceStatus: lastFetchSucceeded && cachedProducts.length ? "live" : "unavailable", fetchedAt: cachedAt ? new Date(cachedAt).toISOString() : null };
  }
  if (!inFlight) {
    lastAttemptAt = Date.now();
    inFlight = loadCatalog().then(products => {
      if (products.length) { cachedProducts = products; cachedAt = Date.now(); lastFetchSucceeded = true; }
      else lastFetchSucceeded = false;
      return cachedProducts;
    }).catch(() => { lastFetchSucceeded = false; return cachedProducts; }).finally(() => { inFlight = null; });
  }
  const products = await inFlight;
  return { products, categories: [...new Set(SEARCHES.map(item => item.category))], sourceStatus: lastFetchSucceeded && products.length ? "live" : "unavailable", fetchedAt: cachedAt ? new Date(cachedAt).toISOString() : null };
}
