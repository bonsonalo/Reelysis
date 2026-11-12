import type { Metadata, Viewport } from "next";
// Self-hosted (bundled font files): the build no longer downloads from Google Fonts.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import AppProviders from "@/providers/AppProvider";
import { themeBootScript } from "@/lib/themeScript";

export const metadata: Metadata = {
  title: 'Reelysis | Instagram Reels analytics',
  description:
    'Analyze your Reels, track competitors, and get a data-backed content strategy.',
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      data-theme="dark"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
