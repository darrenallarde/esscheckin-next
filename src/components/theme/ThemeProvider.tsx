"use client";

import { useOrganization } from "@/hooks/useOrganization";
import { getTheme, getThemeCSSOverrides } from "@/lib/themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization } = useOrganization();
  const theme = getTheme(currentOrganization?.themeId);
  const overrides = getThemeCSSOverrides(theme);

  return (
    <div style={overrides as React.CSSProperties} className="contents">
      {children}
    </div>
  );
}
