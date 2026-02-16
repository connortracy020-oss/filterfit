import type { Metadata } from "next";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { ToastListener } from "@/components/toast-listener";
import "./globals.css";

export const metadata: Metadata = {
  title: "VendorCredit Radar",
  description: "Recover vendor warranty credits and supplier RMAs faster."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <Providers>
          <Suspense fallback={null}>
            <ToastListener />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
