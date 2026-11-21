import React from "react";
import Link from "next/link";
import type { Project } from "@/types/project";

export interface ProjectTitleLinkProps {
  project: Project;
  getProjectHref?: (project: Project) => string | undefined;
  className?: string;
}

/**
 * Renders a project title, linked to its detail page when the template was
 * given a `getProjectHref` resolver (public multi-page mode). In live preview
 * no resolver is passed, so the plain title renders exactly as before.
 */
export function ProjectTitleLink({
  project,
  getProjectHref,
  className = "",
}: ProjectTitleLinkProps): React.JSX.Element {
  const href = getProjectHref?.(project);
  if (!href) return <>{project.title}</>;
  return (
    <Link href={href} className={`hover:underline underline-offset-4 rounded-sm ${className}`}>
      {project.title}
    </Link>
  );
}
