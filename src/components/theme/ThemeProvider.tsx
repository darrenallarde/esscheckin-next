"use client";

import { useLayoutEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { getTheme, getThemeCSSOverrides } from "@/lib/themes";

const THEME_STORAGE_KEY = "seedling-current-theme-id";

function applyTheme(themeId: string | null | undefined) {
  const theme = getTheme(themeId);
  const overrides = getThemeCSSOverrides(theme);
  const root = document.documentElement;
  Object.entries(overrides).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization } = useOrganization();

  // useLayoutEffect fires synchronously before the browser paints,
  // preventing the default theme from flashing before the org theme loads.
  useLayoutEffect(() => {
    const themeId =
      currentOrganization?.themeId ?? localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(themeId);
  }, [currentOrganization?.themeId]);

  // Cache themeId so next page load can apply it instantly
  useLayoutEffect(() => {
    if (currentOrganization?.themeId) {
      localStorage.setItem(THEME_STORAGE_KEY, currentOrganization.themeId);
    }
  }, [currentOrganization?.themeId]);

  return <>{children}</>;
}
