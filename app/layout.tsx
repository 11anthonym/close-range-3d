import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Close Range — 3D Browser Game",
  description: "A fan-made 3D browser tribute with open-ended face, ear, eye, nose, and mouth targeting.",
  applicationName: "Close Range",
  authors: [{ name: "Close Range Restoration Project" }],
  openGraph: {
    title: "Close Range — No Cover. No Reloads. No Distance.",
    description: "24 close-range sequences where the face, the ear, and the entire head are open.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Close Range — 3D Browser Game",
    description: "The face. The ear. The entire head. All open in 24 browser-playable sequences.",
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
