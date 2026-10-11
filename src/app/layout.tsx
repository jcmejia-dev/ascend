import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./refinement.css";
export const metadata: Metadata = {
  title: "ASCEND — Learn. Build. Prove.",
  description: "Your personal learning and certification companion.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icons/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0F12",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
