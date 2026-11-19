import React from "react";
import Link from "next/link";
import { FolioCraftLogo } from "@/components/landing/icons";
import { AlertCircleIcon } from "@/components/portfolio/PortfolioIcons";

export interface PublicPortfolioStatusProps {
  username?: string;
}

/**
 * Branded 404 screen when a portfolio is not found or is unpublished (PUB-04).
 * Preserves privacy: unpublished and non-existent portfolios render identically.
 */
export function PortfolioNotFound({ username }: PublicPortfolioStatusProps): React.JSX.Element {
  const displayUsername = username ? `@${username}` : "this user";

  return (
    <div
      data-testid="portfolio-not-found"
      className="min-h-screen bg-[#faf9fd] text-[#0f172a] flex flex-col items-center justify-center p-6 selection:bg-[#6E56CF]/20"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-50 text-[#6E56CF] mb-2 mx-auto">
          <FolioCraftLogo className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#6E56CF] bg-purple-50 rounded-full">
            404 — Portfolio Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Portfolio Unavailable
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            The portfolio for{" "}
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold">
              {displayUsername}
            </code>{" "}
            could not be found or has not been published yet.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-[#6E56CF] hover:bg-[#5b45b2] text-white text-sm font-semibold transition-all shadow-md shadow-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E56CF] focus-visible:ring-offset-2"
          >
            Explore FolioCraft
          </Link>

          <p className="text-xs text-slate-500">
            Is this your username?{" "}
            <Link href="/login" className="text-[#6E56CF] hover:underline font-medium">
              Sign in to your dashboard
            </Link>{" "}
            to manage and publish your portfolio.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Branded 400 screen when an invalid username format is provided in the URL (PUB-04).
 */
export function InvalidUsername({ username }: PublicPortfolioStatusProps): React.JSX.Element {
  return (
    <div
      data-testid="portfolio-invalid-username"
      className="min-h-screen bg-[#faf9fd] text-[#0f172a] flex flex-col items-center justify-center p-6 selection:bg-amber-500/20"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mb-2 mx-auto">
          <AlertCircleIcon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 rounded-full">
            400 — Invalid Username
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Invalid Portfolio URL
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {username ? (
              <>
                The username{" "}
                <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold">
                  {username}
                </code>{" "}
                is not valid.
              </>
            ) : (
              "The requested username is invalid."
            )}{" "}
            Usernames must be 3–50 characters long and contain only alphanumeric characters, hyphens, and underscores.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Return to FolioCraft Home
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Branded error screen when backend API or network connection is unavailable (PUB-04).
 */
export function ServiceUnavailable(): React.JSX.Element {
  return (
    <div
      data-testid="portfolio-service-unavailable"
      className="min-h-screen bg-[#faf9fd] text-[#0f172a] flex flex-col items-center justify-center p-6 selection:bg-rose-500/20"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mb-2 mx-auto">
          <AlertCircleIcon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-700 bg-rose-50 rounded-full">
            Service Notice
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Unable to Load Portfolio
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            We are experiencing temporary difficulties connecting to the FolioCraft servers. Please check back in a few moments.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Back to FolioCraft
          </Link>
        </div>
      </div>
    </div>
  );
}

