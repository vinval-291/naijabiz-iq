import type { Metadata, Viewport } from "next";
import { AppStateProvider } from "@/components/app-state";
import "./globals.css";

// Fonts are self-hosted from public/fonts and declared in globals.css (no Google Fonts at runtime).
const PRELOAD_FONTS = ["/fonts/inter-latin-wght-normal.woff2", "/fonts/outfit-latin-wght-normal.woff2"];

export const metadata: Metadata = {
  title: "NaijaBiz IQ",
  description: "Understand your business. Make smarter decisions. Financial intelligence for Nigerian small businesses, built for Wema Bank.",
};

export const viewport: Viewport = {
  themeColor: "#981D87",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className="h-full antialiased">
      <head>
        {PRELOAD_FONTS.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
        ))}
      </head>
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before React loads. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
