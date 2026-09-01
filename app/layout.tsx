import type { Metadata, Viewport } from "next";
import { Inter_Tight, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NavigationLoadingProvider } from "@/components/loading/navigation-loading-context";
import { clientEnv } from "@/lib/env";

const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${clientEnv.NEXT_PUBLIC_APP_NAME} · Portfolio analysis, precisely`,
    template: `%s · ${clientEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description:
    "Deep, source-backed analysis of every position you hold: SEC filings, 13F consensus, and live market data, cross-referenced automatically.",
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_APP_URL),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f6" },
    { media: "(prefers-color-scheme: dark)", color: "#101319" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${mono.variable} min-h-screen bg-background font-sans text-[15px] antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
