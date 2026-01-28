/**
 * Theme System for Seedling Insights
 *
 * Each theme provides colors that reflect the spiritual nature of the platform:
 * - Primary: Main brand color for buttons, links, accents
 * - Accent: Secondary color for highlights, success states
 * - Each theme has a name and description for the theme picker
 */

export interface Theme {
  id: string;
  name: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  description: string;
}

export const THEMES: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Seedling',
    primary: '#3B82F6',      // Blue-500
    primaryForeground: '#FFFFFF',
    accent: '#10B981',       // Emerald-500
    accentForeground: '#FFFFFF',
    description: 'Fresh and hopeful'
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    primary: '#0EA5E9',      // Sky-500
    primaryForeground: '#FFFFFF',
    accent: '#06B6D4',       // Cyan-500
    accentForeground: '#FFFFFF',
    description: 'Calm and refreshing'
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    primary: '#22C55E',      // Green-500
    primaryForeground: '#FFFFFF',
    accent: '#84CC16',       // Lime-500
    accentForeground: '#000000',
    description: 'Grounded and alive'
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    primary: '#F97316',      // Orange-500
    primaryForeground: '#FFFFFF',
    accent: '#EAB308',       // Yellow-500
    accentForeground: '#000000',
    description: 'Warm and welcoming'
  },
  berry: {
    id: 'berry',
    name: 'Berry',
    primary: '#EC4899',      // Pink-500
    primaryForeground: '#FFFFFF',
    accent: '#8B5CF6',       // Violet-500
    accentForeground: '#FFFFFF',
    description: 'Bold and joyful'
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    primary: '#6366F1',      // Indigo-500
    primaryForeground: '#FFFFFF',
    accent: '#818CF8',       // Indigo-400
    accentForeground: '#FFFFFF',
    description: 'Deep and contemplative'
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
 * Generate CSS custom properties for a theme
 */
export function getThemeCSSVariables(theme: Theme): Record<string, string> {
  return {
    '--theme-primary': theme.primary,
    '--theme-primary-foreground': theme.primaryForeground,
    '--theme-accent': theme.accent,
    '--theme-accent-foreground': theme.accentForeground,
  };
}

/**
 * All available themes as an array for the theme picker
 */
export const THEME_LIST = Object.values(THEMES);
