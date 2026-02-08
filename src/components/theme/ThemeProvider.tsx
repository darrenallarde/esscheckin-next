"use client";

import { useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { getTheme, getThemeCSSOverrides } from "@/lib/themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    const theme = getTheme(currentOrganization?.themeId);
    const overrides = getThemeCSSOverrides(theme);
    const root = document.documentElement;

    const entries = Object.entries(overrides);
    entries.forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    return () => {
      entries.forEach(([key]) => {
        root.style.removeProperty(key);
      });
    };
  }, [currentOrganization?.themeId]);

  return <>{children}</>;
}
