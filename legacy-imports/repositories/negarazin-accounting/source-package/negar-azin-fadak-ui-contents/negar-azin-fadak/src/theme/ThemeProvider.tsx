import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ThemeName } from "./themes";

interface ThemeCtx {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  density: "comfortable" | "compact";
  setDensity: (d: "comfortable" | "compact") => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeName>(
    (localStorage.getItem("naf.theme") as ThemeName) || "default"
  );
  const [density, setDensity] = useState<"comfortable" | "compact">(
    (localStorage.getItem("naf.density") as any) || "comfortable"
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme === "dark" ? "dark" : "default"
    );
    document.documentElement.setAttribute("data-theme-name", theme);
    document.documentElement.setAttribute("data-density", density);
    localStorage.setItem("naf.theme", theme);
    localStorage.setItem("naf.density", density);
  }, [theme, density]);

  const value = useMemo(() => ({ theme, setTheme, density, setDensity }), [theme, density]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
