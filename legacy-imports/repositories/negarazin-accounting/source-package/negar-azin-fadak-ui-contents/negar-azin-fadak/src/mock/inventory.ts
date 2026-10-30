import { generateEntities } from "./generate";

export const warehouses = generateEntities("WH", 7, (i) => `انبار ${i}`, (i) => ["تهران", "کرج", "اصفهان", "شیراز"][i % 4]);
export const stockMovements = generateEntities("SM", 26, (i) => `رسید/حواله انبار ${i}`);
export const lowStockItems = generateEntities("LS", 12, (i) => `کالای کم‌موجود ${i}`);
