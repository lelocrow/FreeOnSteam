import type { Metadata, Viewport } from "next";
import Script from "next/script";

import "./globals.css";

function metadataBase(): URL {
  try {
    return new URL(process.env.SITE_URL || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: metadataBase(),
  title: "FreeOnSteam — Paid Steam games free to keep",
  description:
    "Find paid Steam games temporarily discounted by 100% and available to add to your account for free.",
  applicationName: "FreeOnSteam",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "FreeOnSteam",
    title: "Paid Steam games free to keep",
    description:
      "Track genuine 100% discounts on paid Steam games, validated for the Brazilian store region.",
    url: "/",
    images: [{ url: "/social-card.svg", width: 1200, height: 630, alt: "FreeOnSteam" }],
  },
  twitter: {
    card: "summary",
    title: "FreeOnSteam",
    description: "Paid Steam games temporarily available to keep for free.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#07111f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9490916828812211"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
