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

/**
 * JRPG color palette per theme.
 * Each theme gets a unique fantasy color flavor for the gamified check-in.
 */
export interface JRPGColors {
  /** Sky/background gradient: 3 stops */
  bgGradient: [string, string, string];
  /** Text box background gradient: 2 stops */
  textboxBg: [string, string];
  /** Text box border */
  textboxBorder: string;
  /** Text box inner shadow + bottom shadow */
  textboxInnerAccent: string;
  textboxShadow: string;
  /** Button gradient: 2 stops */
  buttonBg: [string, string];
  buttonHoverBg: [string, string];
  /** Button border (gold/metallic accent) */
  buttonBorder: string;
  /** Button text color */
  buttonText: string;
  /** Button bottom shadow */
  buttonShadow: string;
  /** Input background, border, text */
  inputBg: string;
  inputBorder: string;
  inputText: string;
  /** Focus ring color */
  focusColor: string;
  /** Heading text color */
  headingColor: string;
  /** Corner decorations */
  cornerColor: string;
  /** Selector arrow + gold text */
  goldColor: string;
  /** Stat bar fill gradient */
  statFill: [string, string];
}

const JRPG_COLORS: Record<string, JRPGColors> = {
  default: {
    bgGradient: ["#87CEEB", "#98D8C8", "#90EE90"],
    textboxBg: ["#E8EEF6", "#D4DEEC"],
    textboxBorder: "#2E5090",
    textboxInnerAccent: "#228B22",
    textboxShadow: "#2F4F2F",
    buttonBg: ["#228B22", "#006400"],
    buttonHoverBg: ["#32CD32", "#228B22"],
    buttonBorder: "#FFD700",
    buttonText: "#FFFACD",
    buttonShadow: "#2F4F2F",
    inputBg: "#F0F4FA",
    inputBorder: "#2E5090",
    inputText: "#2F4F2F",
    focusColor: "#228B22",
    headingColor: "#2F4F2F",
    cornerColor: "#D4AF37",
    goldColor: "#FFD700",
    statFill: ["#4CAF50", "#2E7D32"],
  },
  ocean: {
    bgGradient: ["#4FC3F7", "#039BE5", "#01579B"],
    textboxBg: ["#E1F5FE", "#B3E5FC"],
    textboxBorder: "#0277BD",
    textboxInnerAccent: "#0288D1",
    textboxShadow: "#01579B",
    buttonBg: ["#0288D1", "#01579B"],
    buttonHoverBg: ["#039BE5", "#0288D1"],
    buttonBorder: "#B3E5FC",
    buttonText: "#E1F5FE",
    buttonShadow: "#01579B",
    inputBg: "#E1F5FE",
    inputBorder: "#0277BD",
    inputText: "#01579B",
    focusColor: "#0288D1",
    headingColor: "#01579B",
    cornerColor: "#4FC3F7",
    goldColor: "#B3E5FC",
    statFill: ["#29B6F6", "#0277BD"],
  },
  forest: {
    bgGradient: ["#81C784", "#388E3C", "#1B5E20"],
    textboxBg: ["#E8F5E9", "#C8E6C9"],
    textboxBorder: "#2E7D32",
    textboxInnerAccent: "#388E3C",
    textboxShadow: "#1B5E20",
    buttonBg: ["#388E3C", "#1B5E20"],
    buttonHoverBg: ["#43A047", "#388E3C"],
    buttonBorder: "#A5D6A7",
    buttonText: "#E8F5E9",
    buttonShadow: "#1B5E20",
    inputBg: "#E8F5E9",
    inputBorder: "#2E7D32",
    inputText: "#1B5E20",
    focusColor: "#388E3C",
    headingColor: "#1B5E20",
    cornerColor: "#66BB6A",
    goldColor: "#A5D6A7",
    statFill: ["#66BB6A", "#2E7D32"],
  },
  sunset: {
    bgGradient: ["#FFCC80", "#FF8A65", "#BF360C"],
    textboxBg: ["#FFF3E0", "#FFE0B2"],
    textboxBorder: "#E65100",
    textboxInnerAccent: "#F4511E",
    textboxShadow: "#BF360C",
    buttonBg: ["#F4511E", "#BF360C"],
    buttonHoverBg: ["#FF5722", "#F4511E"],
    buttonBorder: "#FFCC80",
    buttonText: "#FFF3E0",
    buttonShadow: "#BF360C",
    inputBg: "#FFF3E0",
    inputBorder: "#E65100",
    inputText: "#BF360C",
    focusColor: "#F4511E",
    headingColor: "#BF360C",
    cornerColor: "#FFB74D",
    goldColor: "#FFCC80",
    statFill: ["#FF7043", "#E65100"],
  },
  berry: {
    bgGradient: ["#F48FB1", "#AD1457", "#880E4F"],
    textboxBg: ["#FCE4EC", "#F8BBD0"],
    textboxBorder: "#AD1457",
    textboxInnerAccent: "#C2185B",
    textboxShadow: "#880E4F",
    buttonBg: ["#C2185B", "#880E4F"],
    buttonHoverBg: ["#D81B60", "#C2185B"],
    buttonBorder: "#F48FB1",
    buttonText: "#FCE4EC",
    buttonShadow: "#880E4F",
    inputBg: "#FCE4EC",
    inputBorder: "#AD1457",
    inputText: "#880E4F",
    focusColor: "#C2185B",
    headingColor: "#880E4F",
    cornerColor: "#EC407A",
    goldColor: "#F48FB1",
    statFill: ["#EC407A", "#AD1457"],
  },
  midnight: {
    bgGradient: ["#9FA8DA", "#3949AB", "#1A237E"],
    textboxBg: ["#E8EAF6", "#C5CAE9"],
    textboxBorder: "#283593",
    textboxInnerAccent: "#3949AB",
    textboxShadow: "#1A237E",
    buttonBg: ["#3949AB", "#1A237E"],
    buttonHoverBg: ["#3F51B5", "#3949AB"],
    buttonBorder: "#9FA8DA",
    buttonText: "#E8EAF6",
    buttonShadow: "#1A237E",
    inputBg: "#E8EAF6",
    inputBorder: "#283593",
    inputText: "#1A237E",
    focusColor: "#3949AB",
    headingColor: "#1A237E",
    cornerColor: "#7986CB",
    goldColor: "#9FA8DA",
    statFill: ["#5C6BC0", "#283593"],
  },
};

/**
 * Get JRPG color palette for a theme
 */
export function getJRPGColors(themeId: string | null | undefined): JRPGColors {
  if (!themeId || !(themeId in JRPG_COLORS)) {
    return JRPG_COLORS.default;
  }
  return JRPG_COLORS[themeId];
}

/**
 * Get CSS custom properties for JRPG theming.
 * These are injected as inline styles on the check-in page wrapper.
 */
export function getJRPGCSSOverrides(
  colors: JRPGColors,
): Record<string, string> {
  return {
    "--jrpg-bg-1": colors.bgGradient[0],
    "--jrpg-bg-2": colors.bgGradient[1],
    "--jrpg-bg-3": colors.bgGradient[2],
    "--jrpg-textbox-bg-1": colors.textboxBg[0],
    "--jrpg-textbox-bg-2": colors.textboxBg[1],
    "--jrpg-textbox-border": colors.textboxBorder,
    "--jrpg-textbox-inner": colors.textboxInnerAccent,
    "--jrpg-textbox-shadow": colors.textboxShadow,
    "--jrpg-btn-bg-1": colors.buttonBg[0],
    "--jrpg-btn-bg-2": colors.buttonBg[1],
    "--jrpg-btn-hover-1": colors.buttonHoverBg[0],
    "--jrpg-btn-hover-2": colors.buttonHoverBg[1],
    "--jrpg-btn-border": colors.buttonBorder,
    "--jrpg-btn-text": colors.buttonText,
    "--jrpg-btn-shadow": colors.buttonShadow,
    "--jrpg-input-bg": colors.inputBg,
    "--jrpg-input-border": colors.inputBorder,
    "--jrpg-input-text": colors.inputText,
    "--jrpg-focus": colors.focusColor,
    "--jrpg-heading": colors.headingColor,
    "--jrpg-corner": colors.cornerColor,
    "--jrpg-gold": colors.goldColor,
    "--jrpg-stat-1": colors.statFill[0],
    "--jrpg-stat-2": colors.statFill[1],
  };
}
