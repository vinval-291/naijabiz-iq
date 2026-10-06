import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Outfit } from "next/font/google";
import { AppStateProvider } from "@/components/app-state";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["400", "600", "700"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "NaijaBiz IQ",
  description: "Understand your business. Make smarter decisions. Financial intelligence for Nigerian small businesses, built for Wema Bank.",
};

export const viewport: Viewport = {
  themeColor: "#981D87",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={`${inter.variable} ${outfit.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
