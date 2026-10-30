// تصاویر جای‌گزین محلی (Inline SVG) برای نسخه پیش‌نمایش.
// در پروژه اصلی، این مقادیر با URL تصاویر واقعی محصول از API جایگزین می‌شود.

const PALETTES: [string, string][] = [
  ["#eef4ff", "#2f63eb"], ["#eafbf1", "#17b26a"], ["#f4eeff", "#7c3aed"],
  ["#eaf6ff", "#0aa0e2"], ["#fff8e6", "#f2a900"], ["#fdeeee", "#e13c3c"],
];

// یک آیکون هندسی مینیمال به‌جای عکس واقعی محصول — بدون وابستگی به تصاویر بیرونی
const GLYPHS = [
  // کیف / کوله
  `<path d="M150 150h100v90a14 14 0 0 1-14 14h-72a14 14 0 0 1-14-14v-90z" fill="none" stroke="{C}" stroke-width="7"/><path d="M168 150v-18a32 32 0 0 1 64 0v18" fill="none" stroke="{C}" stroke-width="7"/>`,
  // گوشی / صفحه
  `<rect x="158" y="120" width="84" height="150" rx="14" fill="none" stroke="{C}" stroke-width="7"/><circle cx="200" cy="248" r="5" fill="{C}"/>`,
  // فنجان / آشپزخانه
  `<path d="M148 150h88v46a44 44 0 0 1-88 0v-46z" fill="none" stroke="{C}" stroke-width="7"/><path d="M236 160h16a18 18 0 0 1 0 36h-16" fill="none" stroke="{C}" stroke-width="7"/>`,
  // هدفون
  `<path d="M140 200a60 60 0 0 1 120 0" fill="none" stroke="{C}" stroke-width="7"/><rect x="128" y="196" width="26" height="46" rx="9" fill="none" stroke="{C}" stroke-width="7"/><rect x="246" y="196" width="26" height="46" rx="9" fill="none" stroke="{C}" stroke-width="7"/>`,
  // باکس / بسته
  `<path d="M140 168l60-32 60 32-60 32-60-32z" fill="none" stroke="{C}" stroke-width="7"/><path d="M140 168v64l60 32 60-32v-64" fill="none" stroke="{C}" stroke-width="7"/><path d="M200 200v64" stroke="{C}" stroke-width="7"/>`,
];

export function productPlaceholder(idx: number): string {
  const [bg, accent] = PALETTES[idx % PALETTES.length];
  const glyph = GLYPHS[idx % GLYPHS.length].replaceAll("{C}", accent);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="${bg}"/>
<circle cx="200" cy="196" r="118" fill="${accent}" opacity="0.08"/>
${glyph}
<rect x="140" y="292" width="120" height="10" rx="5" fill="${accent}" opacity="0.22"/>
<rect x="166" y="312" width="68" height="8" rx="4" fill="${accent}" opacity="0.14"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
