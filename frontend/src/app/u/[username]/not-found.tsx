import React from "react";
import { PortfolioNotFound } from "@/components/portfolio/PublicPortfolioStatus";

/**
 * Public Portfolio Not Found Route Boundary (PUB-04).
 * Rendered when notFound() is invoked within the /u/:username route hierarchy.
 */
export default function PublicNotFoundPage(): React.JSX.Element {
  return <PortfolioNotFound />;
}

