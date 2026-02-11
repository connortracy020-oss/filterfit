export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/jobs/:path*", "/today/:path*", "/settings/:path*"]
};
