import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const activeStatuses = new Set(["active", "trialing"]);

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (!token?.sub) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!token.orgId) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    return NextResponse.redirect(onboardingUrl);
  }

  const bypass = ["true", "1", "yes"].includes(
    String(process.env.ENABLE_BILLING_BYPASS ?? "false").toLowerCase()
  );

  if (!bypass && !activeStatuses.has(String(token.subscriptionStatus ?? "").toLowerCase())) {
    const pricingUrl = request.nextUrl.clone();
    pricingUrl.pathname = "/pricing";
    pricingUrl.searchParams.set("billing", "required");
    return NextResponse.redirect(pricingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"]
};
