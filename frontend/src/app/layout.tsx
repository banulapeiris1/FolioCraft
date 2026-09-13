import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#faf9fd] text-[#0f172a]">
        {children}
      </body>
    </html>
  );
}
