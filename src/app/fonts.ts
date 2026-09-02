import localFont from "next/font/local";

/**
 * Brand webfonts, self-hosted from the repo — the same woff2 files the EAN
 * website ships. Served from our own origin: no render-blocking third-party
 * requests, no data sent to font CDNs before consent.
 */
export const atkinson = localFont({
  src: [
    { path: "../fonts/AtkinsonHyperlegibleNext-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/AtkinsonHyperlegibleNext-RegularItalic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/AtkinsonHyperlegibleNext-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/AtkinsonHyperlegibleNext-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/AtkinsonHyperlegibleNext-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-atkinson",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

export const sentient = localFont({
  src: [
    { path: "../fonts/Sentient-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Sentient-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Sentient-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-sentient",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});
