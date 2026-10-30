// این فایل نمایانگر خروجی آینده «مدیریت قالب‌ها» است.
// در معماری واقعی، این آبجکت‌ها از API قالب فعال (Template Engine) دریافت می‌شوند.
export type ThemeName = "default" | "dark" | "emerald" | "violet";

export interface PlatformTheme {
  id: ThemeName;
  label: string;
  radius: "sharp" | "soft" | "round";
  swatch: string;
}

export const AVAILABLE_THEMES: PlatformTheme[] = [
  { id: "default", label: "پیش‌فرض سازمانی (آبی)", radius: "soft", swatch: "#2f63eb" },
  { id: "emerald", label: "زمردی", radius: "soft", swatch: "#17b26a" },
  { id: "violet", label: "بنفش خلاقانه", radius: "round", swatch: "#7c3aed" },
  { id: "dark", label: "حالت تیره", radius: "soft", swatch: "#141b2d" },
];
