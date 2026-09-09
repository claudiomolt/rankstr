import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "rankstr — Claim a rank on the public leaderboard",
  description:
    "Public pay-to-rank leaderboard. Rank is what you pay — nothing else. Sats over Lightning, Bitcoin only.",
};

/** Applied before paint so a stored dark preference never flashes light first. */
const THEME_SCRIPT = `try{var t=localStorage.getItem("rankstr-theme");if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.setAttribute("data-theme","dark")}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`:root{--font-sans:"Poppins",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}`}</style>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-3 pb-16 md:pt-3.5">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
