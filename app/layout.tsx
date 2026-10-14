
import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import "../src/index.css";

export const metadata: Metadata = {
  title: "Smart School | School operations",
  description:
    "A dependable workspace for the people who keep school moving.",
  applicationName: "Smart School",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Smart School",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
