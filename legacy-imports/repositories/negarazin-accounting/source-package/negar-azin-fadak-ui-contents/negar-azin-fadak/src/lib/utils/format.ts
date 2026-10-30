// ابزارهای نمایش فارسی — اعداد، ارز، تاریخ ساده شمسی (بدون وابستگی خارجی)

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function formatNumber(n: number): string {
  return toFaDigits(new Intl.NumberFormat("en-US").format(n));
}

export function formatCurrency(n: number, unit: string = "تومان"): string {
  return `${formatNumber(n)} ${unit}`;
}

const GREGORIAN_TO_JALALI_OFFSET_DAYS = 226894; // تقریبی، فقط برای نمایش دمو

export function toJalaliApprox(date: Date): string {
  // این تابع صرفاً برای نمایش Mock تاریخ شمسی «تقریبی» است، نه محاسبه دقیق تقویمی.
  // در پیاده‌سازی واقعی باید از کتابخانه رسمی تاریخ شمسی تیم استفاده شود.
  const months = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
  ];
  const gYear = date.getFullYear();
  const jYear = gYear - 621;
  const monthIndex = date.getMonth();
  const day = date.getDate();
  return `${toFaDigits(day)} ${months[monthIndex]} ${toFaDigits(jYear)}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const time = `${toFaDigits(d.getHours().toString().padStart(2, "0"))}:${toFaDigits(
    d.getMinutes().toString().padStart(2, "0")
  )}`;
  return `${toJalaliApprox(d)} - ${time}`;
}

export function formatDate(iso: string): string {
  return toJalaliApprox(new Date(iso));
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "لحظاتی پیش";
  if (mins < 60) return `${toFaDigits(mins)} دقیقه پیش`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${toFaDigits(hours)} ساعت پیش`;
  const days = Math.round(hours / 24);
  return `${toFaDigits(days)} روز پیش`;
}
