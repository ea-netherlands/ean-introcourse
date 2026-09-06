import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { atkinson, sentient } from "./fonts";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "EA Netherlands — Fellowship",
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
      <body
        className="min-h-full flex flex-col font-sans"
        style={{ background: "var(--bg-page)", color: "var(--text-primary)" }}
      >
        {/*
          Runs before React hydrates — reads localStorage and sets data-theme
          on <html> so the correct theme is applied on first paint (no flash).
          suppressHydrationWarning on <html> silences the data-theme mismatch.
        */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'system';var d=document.documentElement;if(t==='dark'){d.setAttribute('data-theme','dark');}else if(t==='light'){d.setAttribute('data-theme','light');}else{d.setAttribute('data-theme',window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}}catch(e){}})();` }}
        />

        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
