/**
 * Theme System for SheepDoggo
 *
 * Each theme provides a full visual identity: sidebar, background, primary, secondary, accent.
 * Colors are stored as hex and converted to HSL for CSS variable injection.
 * The ThemeProvider component reads the org's themeId and applies overrides.
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  // Primary brand color
  primary: string;
  primaryForeground: string;
  // Accent highlights
  accent: string;
  accentForeground: string;
  // Sidebar
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarAccent: string;
  sidebarBorder: string;
  // Page background
  background: string;
  backgroundForeground: string;
  // Secondary (structural accent)
  secondary: string;
  secondaryForeground: string;
  // Ring color (focus outlines)
  ring: string;
}

/**
 * Convert hex color to HSL string (shadcn format: "H S% L%")
 */
export function hexToHSL(hex: string): string {
  // Remove #
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let hue = 0;
  if (max === r) {
    hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    hue = ((b - r) / d + 2) * 60;
  } else {
    hue = ((r - g) / d + 4) * 60;
  }

  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Get CSS variable overrides for a theme.
 * Returns a Record suitable for React inline styles.
 */
export function getThemeCSSOverrides(theme: Theme): Record<string, string> {
  return {
    "--primary": hexToHSL(theme.primary),
    "--primary-foreground": hexToHSL(theme.primaryForeground),
    "--accent": hexToHSL(theme.accent),
    "--accent-foreground": hexToHSL(theme.accentForeground),
    "--ring": hexToHSL(theme.ring),
    "--background": hexToHSL(theme.background),
    "--foreground": hexToHSL(theme.backgroundForeground),
    "--secondary": hexToHSL(theme.secondary),
    "--secondary-foreground": hexToHSL(theme.secondaryForeground),
    "--sidebar-background": hexToHSL(theme.sidebarBackground),
    "--sidebar-foreground": hexToHSL(theme.sidebarForeground),
    "--sidebar-primary": hexToHSL(theme.primary),
    "--sidebar-primary-foreground": hexToHSL(theme.primaryForeground),
    "--sidebar-accent": hexToHSL(theme.sidebarAccent),
    "--sidebar-accent-foreground": hexToHSL(theme.sidebarForeground),
    "--sidebar-border": hexToHSL(theme.sidebarBorder),
    "--sidebar-ring": hexToHSL(theme.ring),
  };
}

export const THEMES: Record<string, Theme> = {
  /**
   * Seedling (Default) — Earthy, natural
   * MUST match globals.css values exactly so existing orgs see zero change.
   * Sidebar: dark forest green | Background: warm cream | Primary: chartreuse
   */
  default: {
    id: "default",
    name: "Seedling",
    description: "Fresh and hopeful",
    primary: "#84CC16",
    primaryForeground: "#292524",
    accent: "#A3E635",
    accentForeground: "#292524",
    sidebarBackground: "#164A2B",
    sidebarForeground: "#F2F2F2",
    sidebarAccent: "#1F6B3D",
    sidebarBorder: "#1F6B3D",
    background: "#E9E2D6",
    backgroundForeground: "#292524",
    secondary: "#166534",
    secondaryForeground: "#FFFFFF",
    ring: "#84CC16",
  },

  /**
   * Ocean — Calm, coastal
   * Sidebar: dark navy | Background: cool blue-gray | Primary: sky blue
   */
  ocean: {
    id: "ocean",
    name: "Ocean",
    description: "Calm and refreshing",
    primary: "#0EA5E9",
    primaryForeground: "#FFFFFF",
    accent: "#38BDF8",
    accentForeground: "#0C2D48",
    sidebarBackground: "#0C2D48",
    sidebarForeground: "#F0F9FF",
    sidebarAccent: "#164E72",
    sidebarBorder: "#164E72",
    background: "#E0ECF4",
    backgroundForeground: "#1E293B",
    secondary: "#0369A1",
    secondaryForeground: "#FFFFFF",
    ring: "#0EA5E9",
  },

  /**
   * Forest — Deep, grounding
   * Sidebar: deep emerald | Background: sage/moss cream | Primary: green
   */
  forest: {
    id: "forest",
    name: "Forest",
    description: "Grounded and alive",
    primary: "#22C55E",
    primaryForeground: "#FFFFFF",
    accent: "#4ADE80",
    accentForeground: "#14532D",
    sidebarBackground: "#14352A",
    sidebarForeground: "#F0FDF4",
    sidebarAccent: "#1A5C3A",
    sidebarBorder: "#1A5C3A",
    background: "#E4EDDF",
    backgroundForeground: "#1A2E1A",
    secondary: "#15803D",
    secondaryForeground: "#FFFFFF",
    ring: "#22C55E",
  },

  /**
   * Sunset — Warm, inviting
   * Sidebar: dark warm brown | Background: warm peach/sand | Primary: orange
   */
  sunset: {
    id: "sunset",
    name: "Sunset",
    description: "Warm and welcoming",
    primary: "#F97316",
    primaryForeground: "#FFFFFF",
    accent: "#FB923C",
    accentForeground: "#431407",
    sidebarBackground: "#3B1F0B",
    sidebarForeground: "#FFF7ED",
    sidebarAccent: "#5C3317",
    sidebarBorder: "#5C3317",
    background: "#F0E4D8",
    backgroundForeground: "#292524",
    secondary: "#C2410C",
    secondaryForeground: "#FFFFFF",
    ring: "#F97316",
  },

  /**
   * Berry — Bold, joyful
   * Sidebar: dark plum/purple | Background: soft lavender-gray | Primary: pink
   */
  berry: {
    id: "berry",
    name: "Berry",
    description: "Bold and joyful",
    primary: "#EC4899",
    primaryForeground: "#FFFFFF",
    accent: "#F472B6",
    accentForeground: "#4A0D2E",
    sidebarBackground: "#2D1035",
    sidebarForeground: "#FDF2F8",
    sidebarAccent: "#4A1A5C",
    sidebarBorder: "#4A1A5C",
    background: "#EDE4F0",
    backgroundForeground: "#292524",
    secondary: "#BE185D",
    secondaryForeground: "#FFFFFF",
    ring: "#EC4899",
  },

  /**
   * Midnight — Deep, contemplative
   * Sidebar: dark slate/indigo | Background: cool gray | Primary: indigo
   */
  midnight: {
    id: "midnight",
    name: "Midnight",
    description: "Deep and contemplative",
    primary: "#6366F1",
    primaryForeground: "#FFFFFF",
    accent: "#818CF8",
    accentForeground: "#1E1B4B",
    sidebarBackground: "#1B1A3B",
    sidebarForeground: "#EEF2FF",
    sidebarAccent: "#2E2C5E",
    sidebarBorder: "#2E2C5E",
    background: "#E4E5F0",
    backgroundForeground: "#1E1B4B",
    secondary: "#4338CA",
    secondaryForeground: "#FFFFFF",
    ring: "#6366F1",
  },
};

export type ThemeId = keyof typeof THEMES;

/**
 * Get theme by ID, falling back to default if not found
 */
export function getTheme(themeId: string | null | undefined): Theme {
  if (!themeId || !(themeId in THEMES)) {
    return THEMES.default;
  }
  return THEMES[themeId];
}

/**
 * All available themes as an array for the theme picker
 */
export const THEME_LIST = Object.values(THEMES);
