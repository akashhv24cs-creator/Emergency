import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const { pathname } = request.nextUrl;
  const isPublic = isPublicRoute(request);
  
  console.log(`[Middleware] Path: ${pathname}, Public: ${isPublic}, Auth: ${!!userId}`);

  if (!userId && !isPublic) {
    console.log(`[Middleware] Unauthorized access to ${pathname}, redirecting to /sign-in`);
    const signInUrl = new URL('/sign-in', request.url);
    // Add the current path as a redirect_url so Clerk knows where to go after login
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
