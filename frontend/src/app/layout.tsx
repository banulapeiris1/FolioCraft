import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Source_Serif_4, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Phase 13 portfolio template typefaces. preload: false keeps them off the
// critical path of every page: a font file is only fetched when a template
// actually renders text with it (font-display-serif / font-text-serif / font-grotesk).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  preload: false,
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "FolioCraft — Turn your CV into a portfolio",
  description:
    "FolioCraft helps developers turn their existing CV information into a professional online portfolio in minutes without tedious manual entry.",
  keywords: [
    "CV to portfolio",
    "developer portfolio",
    "portfolio generator",
    "resume to website",
    "developer website",
  ],
  authors: [{ name: "FolioCraft" }],
  openGraph: {
    title: "FolioCraft — Turn your CV into a portfolio",
    description:
      "Transform your CV into a clean, modern developer portfolio without starting over.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${sourceSerif.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#faf9fd] text-[#0f172a]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
