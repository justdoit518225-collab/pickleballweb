import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { ContactWidget } from "@/components/contact/contact-widget";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CourtMotion } from "@/components/ui/court-motion";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-[var(--ink)] selection:bg-brand-lime selection:text-brand-navy">
        <AuthSessionProvider>
          <CourtMotion />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <ContactWidget />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
