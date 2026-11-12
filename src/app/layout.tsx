import type { Metadata, Viewport } from "next";
import { atkinson, sentient } from "./fonts";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "EA Netherlands — Fellowship",
  // Course platform for enrolled participants: keep it out of search engines.
  robots: { index: false, follow: false },
  description:
    "Reading materials and exercises for the EA Netherlands Intro Fellowship",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
      className={`h-full antialiased ${atkinson.variable} ${sentient.variable}`}
    >
      <head>
        {/*
          Runs before React hydrates — reads localStorage and stamps data-theme
          on <html> so the correct theme is applied on first paint (no flash).
          Native <script> in <head> avoids next/script's Turbopack warning.
          suppressHydrationWarning on <html> silences the server/client mismatch.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'system';var d=document.documentElement;if(t==='dark'){d.setAttribute('data-theme','dark');}else if(t==='light'){d.setAttribute('data-theme','light');}else{d.setAttribute('data-theme',window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col font-sans"
        style={{ background: "var(--bg-page)", color: "var(--text-primary)" }}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
