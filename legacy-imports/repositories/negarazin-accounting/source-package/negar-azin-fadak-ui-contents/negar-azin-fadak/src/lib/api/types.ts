// ===== قرارداد یکپارچه دیتا (Data Contract) =====
// این تایپ‌ها معماری Backend را «تعریف» نمی‌کنند؛ فقط شکل دیتایی هستند
// که UI برای رندر نیاز دارد. تیم اصلی بعداً همین شکل را از API واقعی پر می‌کند.

export type EntityStatus =
  | "active"
  | "inactive"
  | "pending"
  | "approved"
  | "rejected"
  | "processing"
  | "draft";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface BaseEntity {
  id: string;
  title: string;
  subtitle?: string;
  status?: EntityStatus;
  createdAt: string;
  updatedAt?: string;
  meta?: Record<string, string | number>;
}

export interface FilterField {
  key: string;
  label: string;
  type: "text" | "select" | "date-range" | "status";
  options?: { label: string; value: string }[];
}

export interface Column<T = any> {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
  render?: (row: T) => React.ReactNode;
  width?: string;
}
