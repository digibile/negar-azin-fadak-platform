/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Vazirmatn", "Tahoma", "sans-serif"],
      },
      colors: {
        primary: {
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
        },
        secondary: { 500: "var(--color-secondary-500)", 600: "var(--color-secondary-600)" },
        success: { 50: "var(--color-success-50)", 500: "var(--color-success-500)", 600: "var(--color-success-600)" },
        warning: { 50: "var(--color-warning-50)", 500: "var(--color-warning-500)", 600: "var(--color-warning-600)" },
        danger: { 50: "var(--color-danger-50)", 500: "var(--color-danger-500)", 600: "var(--color-danger-600)" },
        info: { 50: "var(--color-info-50)", 500: "var(--color-info-500)", 600: "var(--color-info-600)" },
        surface: "var(--color-surface)",
        bg: "var(--color-bg)",
        border: "var(--color-border)",
        text: { DEFAULT: "var(--color-text)", muted: "var(--color-text-muted)" },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
        pop: "0 10px 30px -10px rgb(0 0 0 / 0.25)",
      },
    },
  },
  plugins: [],
};
