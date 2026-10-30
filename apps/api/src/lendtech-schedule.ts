/**
 * Add calendar months without JavaScript's end-of-month overflow.
 * The returned value is a UTC date at midnight, suitable for SQL DATE fields.
 */
export function addMonthsClamped(start: Date, months: number): Date {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())
      || !Number.isInteger(months) || months < 1 || months > 120) {
    throw new Error("پارامتر تاریخ سررسید معتبر نیست");
  }

  const target = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth() + months,
    1,
  ));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(start.getUTCDate(), lastDay);

  return new Date(Date.UTC(year, month, day));
}
