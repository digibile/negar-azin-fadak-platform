import { generateEntities } from "./generate";

export const creditRequests = generateEntities("CR", 24, (i) => `درخواست اعتبار ${i}`, (i) => `متقاضی ${i}`);
export const loanCases = generateEntities("LN", 19, (i) => `پرونده تسهیلات ${i}`, (i) => `مبلغ ${(i + 1) * 15}میلیون تومان`);
export const bankAccounts = generateEntities("BA", 6, (i) => `حساب بانکی ${i}`, () => "بانک ملت");
export const journalEntries = generateEntities("JR", 30, (i) => `سند حسابداری ${i}`);
export const crmActivities = generateEntities("ACT", 25, (i) => `فعالیت CRM ${i}`, (i) => ["تماس", "پیگیری", "یادداشت", "کمپین"][i % 4]);
export const auditLogs = generateEntities("AUD", 50, (i) => `رویداد Audit ${i}`, (i) => ["ورود کاربر", "ویرایش رکورد", "حذف رکورد", "تغییر دسترسی"][i % 4]);
