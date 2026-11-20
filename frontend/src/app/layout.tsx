import type { Metadata } from "next";
import { Instrument_Serif, Inter, IBM_Plex_Mono, Caveat } from "next/font/google";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import "./globals.css";

const display = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});

const hand = Caveat({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: "GapAnalyzer — Know exactly what your resume is missing.",
  description:
    "Upload your resume and a job description. Get a clear, AI-powered gap analysis with your match score, missing skills, and actionable next steps — so you can apply with confidence and get hired faster.",
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
      className={`${display.variable} ${body.variable} ${mono.variable} ${hand.variable}`}
    >
      <head>
        {/* No-flash boot (DESIGN_SYSTEM §3.1): apply the stored/system theme
            before first paint. Inline script pattern per Next.js "Preventing
            flash before hydration" → Themes. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}',
          }}
        />
      </head>
      <body>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
