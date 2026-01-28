import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware for Seedling Insights
 *
 * Handles:
 * 1. Authentication checks for protected routes
 * 2. Redirects from legacy routes to new [org] path structure
 * 3. Auth page redirect when already authenticated
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicPaths = ["/auth", "/setup", "/api"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Admin routes (require super admin, handled by page)
  const isAdminPath = pathname.startsWith("/admin");

  // Legacy protected routes (without org slug) - redirect to /setup for org selection
  const legacyProtectedPaths = ["/dashboard", "/students", "/attendance", "/curriculum", "/settings", "/analytics", "/pastoral"];
  const isLegacyProtectedPath = legacyProtectedPaths.some((path) =>
    pathname === path || pathname.startsWith(path + "/")
  );

  // Check if this looks like an org-prefixed path
  // Pattern: /{orgSlug}/{route} where route is dashboard, students, etc.
  const segments = pathname.replace(/^\//, "").split("/");
  const potentialOrgSlug = segments[0];
  const routeAfterOrg = "/" + segments.slice(1).join("/");

  const knownRoutes = ["/dashboard", "/students", "/attendance", "/curriculum", "/settings", "/analytics", "/pastoral"];
  const isOrgPrefixedPath = potentialOrgSlug &&
    !publicPaths.some(p => pathname.startsWith(p)) &&
    !isAdminPath &&
    !isLegacyProtectedPath &&
    (knownRoutes.some(r => routeAfterOrg === r || routeAfterOrg.startsWith(r + "/")));

  // Authentication check for protected routes
  if (!user) {
    // If accessing a protected route without auth, redirect to login
    if (isLegacyProtectedPath || isOrgPrefixedPath || isAdminPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Handle legacy routes - redirect to setup where org will be determined
  if (user && isLegacyProtectedPath) {
    // User is authenticated but on legacy path - redirect to setup
    // Setup will redirect them to their org's path
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // If authenticated and on auth page, redirect to setup (which will then redirect to their org)
  if (user && pathname === "/auth") {
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
