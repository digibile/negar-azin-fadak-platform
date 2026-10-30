import { generateEntities } from "./generate";
import { productPlaceholder } from "./placeholder";

const productNames = ["گوشی هوشمند", "لپ‌تاپ اداری", "هدفون بی‌سیم", "ساعت هوشمند", "کیف چرمی", "یخچال دوقلو", "تلویزیون هوشمند", "اسپیکر بلوتوث"];

export const products = Array.from({ length: 48 }, (_, i) => {
  const idx = i + 1;
  const name = productNames[i % productNames.length];
  return {
    id: `PRD-${String(idx).padStart(4, "0")}`,
    title: `${name} مدل ${idx}`,
    subtitle: `دسته: ${["دیجیتال", "خانه و آشپزخانه", "مد و پوشاک", "لوازم جانبی"][i % 4]}`,
    status: (["active", "inactive", "draft"] as const)[i % 3],
    price: 1200000 + i * 45000,
    stock: (i * 7) % 120,
    rating: 3 + (i % 5) * 0.4,
    image: productPlaceholder(idx),
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  };
});

export const categories = generateEntities("CAT", 10, (i) => `دسته‌بندی ${i}`);
export const orders = generateEntities("ORD-", 34, (i) => `سفارش شماره ${100000 + i}`, (i) => `مشتری نمونه ${i}`);
export const purchases = generateEntities("PO", 18, (i) => `سفارش خرید ${i}`, (i) => `تأمین‌کننده ${i % 6}`);
export const suppliers = generateEntities("SUP", 15, (i) => `تأمین‌کننده ${i}`);
export const merchants = generateEntities("MER", 20, (i) => `پذیرنده نمونه ${i}`, (i) => (i % 2 ? "فروشگاه فیزیکی" : "فروشگاه اینترنتی"));
export const customersData = generateEntities("CUS", 60, (i) => `مشتری ${i}`, (i) => `09${100000000 + i}`);
