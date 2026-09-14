"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FolioCraftLogo, MenuIcon, XIcon } from "./icons";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "How it works", href: "#workflow" },
    { label: "Features", href: "#features" },
    { label: "Templates", href: "#templates" },
    { label: "For Developers", href: "#audience" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#faf9fd]/85 backdrop-blur-md border-b border-[#eae6f5] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/40 rounded-lg p-1"
          aria-label="FolioCraft Home"
        >
          <FolioCraftLogo className="w-8 h-8 rounded-lg shadow-sm transition-transform group-hover:scale-105" />
          <span className="text-xl font-bold tracking-tight text-[#0f172a] font-sans">
            Folio<span className="text-[#6e56cf]">Craft</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden md:flex items-center gap-8"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[#475569] hover:text-[#0f172a] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Right CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-[#475569] hover:text-[#0f172a] px-3 py-2 rounded-lg transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium text-white bg-[#6e56cf] hover:bg-[#5d46be] px-4 py-2 rounded-lg shadow-sm shadow-[#6e56cf]/25 transition-all hover:shadow-md hover:shadow-[#6e56cf]/30 active:scale-[0.98]"
          >
            Create my portfolio
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#475569] hover:text-[#0f172a] hover:bg-[#f1edf9] focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/30"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#eae6f5] bg-[#ffffff] px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md text-base font-medium text-[#475569] hover:text-[#0f172a] hover:bg-[#faf9fd]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-4 border-t border-[#eae6f5] flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-base font-medium text-[#475569] hover:text-[#0f172a] rounded-lg hover:bg-[#faf9fd]"
            >
              Log in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-base font-medium text-white bg-[#6e56cf] hover:bg-[#5d46be] rounded-lg shadow-sm"
            >
              Create my portfolio
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
