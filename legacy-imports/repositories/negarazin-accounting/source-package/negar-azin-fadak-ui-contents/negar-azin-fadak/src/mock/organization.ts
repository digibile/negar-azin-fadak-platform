import { generateEntities } from "./generate";

export const companies = generateEntities("CMP", 6, (i) => `شرکت زیرمجموعه ${i}`, () => "شرکت سهامی خاص");
export const branches = generateEntities("BR", 14, (i) => `شعبه شماره ${i}`, (i) => (i % 3 === 0 ? "تهران" : i % 3 === 1 ? "اصفهان" : "مشهد"));
export const brands = generateEntities("BRD", 9, (i) => `برند نگار ${i}`, () => "برند فعال گروه");
export const stores = generateEntities("STR", 22, (i) => `فروشگاه ${i}`, (i) => (i % 2 ? "فروشگاه حضوری" : "فروشگاه آنلاین"));
export const businessUnits = generateEntities("BU", 8, (i) => `واحد کسب‌وکار ${i}`);
export const departments = generateEntities("DEP", 12, (i) => `دپارتمان ${i}`, (i) => ["فروش", "مالی", "فناوری", "منابع انسانی"][i % 4]);
export const positions = generateEntities("POS", 16, (i) => `سمت شغلی ${i}`);
export const employees = generateEntities("EMP", 40, (i) => `کارمند نمونه ${i}`, (i) => positions[i % positions.length].title);
