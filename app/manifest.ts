import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Smart School",
    short_name: "Smart School",
    description: "Smart School management system",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#f8fafc",
    theme_color: "#1d4ed8",
    orientation: "any",

    icons: [
      {
        src: "/smart-school-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/smart-school-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/smart-school-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],

    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "1911x871",
        type: "image/png",
        form_factor: "wide",
        label: "Smart School desktop dashboard",
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "360x682",
        type: "image/png",
        label: "Smart School mobile dashboard",
      },
    ],
  };
}
