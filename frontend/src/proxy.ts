import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_AUTH_PATHS = ["/login", "/register", "/forgot-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg")
  ) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const authToken =
    request.cookies.get("auth_token")?.value ||
    request.cookies.get("slos_token")?.value;

  const isAuthenticated = Boolean(authToken && authToken.trim().length > 0);
  const isAuthRoute = PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path));

  // 1. Authenticated user trying to access /login or /register -> redirect to /
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Unauthenticated user trying to access protected dashboard routes -> redirect to /login
  if (!isAuthenticated && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    // Optionally preserve the return url
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
