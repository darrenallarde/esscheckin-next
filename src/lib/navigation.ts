/**
 * Navigation Utilities for Path-Based Org Routing
 *
 * All protected routes use the pattern: /{orgSlug}/{route}
 * Example: /echo-students/dashboard, /grace-youth/students
 */

/**
 * Generate a path with the organization slug prefix
 * @param orgSlug - The organization slug (e.g., 'echo-students')
 * @param path - The route path (e.g., '/dashboard', '/settings/team')
 * @returns The full path with org prefix (e.g., '/echo-students/dashboard')
 */
export function orgPath(orgSlug: string | undefined | null, path: string): string {
  if (!orgSlug) {
    // Fallback to just the path if no org
    return path;
  }
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `/${orgSlug}${normalizedPath}`;
}

/**
 * Navigation routes used in the app
 */
export const ROUTES = {
  // Protected routes (require org context)
  dashboard: '/dashboard',
  students: '/students',
  pastoral: '/pastoral',
  analytics: '/analytics',
  curriculum: '/curriculum',
  attendance: '/attendance',
  settings: '/settings',
  settingsAccount: '/settings/account',
  settingsTeam: '/settings/team',
  settingsOrganization: '/settings/organization',
  settingsImport: '/settings/import',

  // Admin routes (super admin only)
  admin: '/admin',
  adminOrganizations: '/admin/organizations',
  adminOrganizationsNew: '/admin/organizations/new',

  // Public routes (no org context)
  auth: '/auth',
  setup: '/setup',
  home: '/',
} as const;

/**
 * Check if a path is a protected org route
 */
export function isProtectedOrgRoute(path: string): boolean {
  const protectedPrefixes = [
    '/dashboard',
    '/students',
    '/pastoral',
    '/analytics',
    '/curriculum',
    '/attendance',
    '/settings',
  ];
  return protectedPrefixes.some(prefix =>
    path === prefix || path.startsWith(prefix + '/')
  );
}

/**
 * Extract org slug from path
 * For paths like /echo-students/dashboard, returns 'echo-students'
 */
export function extractOrgSlugFromPath(pathname: string): string | null {
  // Remove leading slash and split
  const segments = pathname.replace(/^\//, '').split('/');

  if (segments.length < 1) return null;

  const potentialSlug = segments[0];

  // Check if this looks like an org slug (not a known public route)
  const publicRoutes = ['auth', 'setup', 'admin', 'api', '_next'];
  if (publicRoutes.includes(potentialSlug)) {
    return null;
  }

  return potentialSlug || null;
}

/**
 * Get the route portion of a path (without org slug)
 * For paths like /echo-students/dashboard, returns '/dashboard'
 */
export function extractRouteFromPath(pathname: string): string {
  const segments = pathname.replace(/^\//, '').split('/');

  if (segments.length <= 1) return '/';

  // Return everything after the first segment
  return '/' + segments.slice(1).join('/');
}
