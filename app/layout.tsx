import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Close Range — 3D Browser Game",
  description: "A fan-made 3D browser restoration of the legendary one-button point-blank parody.",
  applicationName: "Close Range",
  authors: [{ name: "Close Range Restoration Project" }],
  openGraph: {
    title: "Close Range — No Cover. No Reloads. No Distance.",
    description: "24 faces. One button. A fully playable 3D browser tribute.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Close Range — 3D Browser Game",
    description: "24 faces. One button. Zero restraint.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#080909",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
