/**
 * FolioCraft Frontend API Client
 *
 * Provides typed, reusable HTTP calls to the FolioCraft backend API.
 * Uses native fetch without external dependencies.
 */

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface RegisterResponse {
  user: AuthUser;
  token: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface CurrentUserResponse {
  user: AuthUser;
}

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Returns the configured base API URL.
 * Throws a configuration error if NEXT_PUBLIC_API_URL is undefined to prevent
 * silent and unexpected local network fallback issues.
 */
function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url || url.trim() === "") {
    throw new Error(
      "Configuration Error: NEXT_PUBLIC_API_URL is not set. Please define it in your environment (e.g. .env.local)."
    );
  }
  return url.replace(/\/+$/, "");
}

/**
 * Performs a standard typed API request with consistent error parsing.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network connection error";
    throw new ApiError(
      `Unable to connect to server: ${errorMsg}. Please check your connection.`,
      0
    );
  }

  // Parse JSON response or fallback safely
  let responseData: unknown = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    const serverMessage =
      responseData &&
      typeof responseData === "object" &&
      "message" in responseData &&
      typeof (responseData as { message: unknown }).message === "string"
        ? (responseData as { message: string }).message
        : `Request failed with status ${response.status}`;

    throw new ApiError(serverMessage, response.status);
  }

  return responseData as T;
}

/**
 * Registers a new user account (POST /api/auth/register)
 */
export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  return request<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Authenticates an existing user account (POST /api/auth/login)
 */
export async function loginUser(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Retrieves the current authenticated user profile (GET /api/auth/me)
 */
export async function getCurrentUser(token: string): Promise<CurrentUserResponse> {
  return request<CurrentUserResponse>("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

import type {
  PortfolioFormData,
  PortfolioResponse,
  PortfoliosResponse,
} from "../types/portfolio";


/**
 * Creates a new portfolio for the authenticated user (POST /api/portfolios)
 */
export async function createPortfolio(
  data: PortfolioFormData,
  token: string
): Promise<PortfolioResponse> {
  return request<PortfolioResponse>("/api/portfolios", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Retrieves a single portfolio by ID for the authenticated user (GET /api/portfolios/:id)
 */
export async function getPortfolio(
  id: string,
  token: string
): Promise<PortfolioResponse> {
  return request<PortfolioResponse>(`/api/portfolios/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Updates an existing portfolio belonging to the authenticated user (PUT /api/portfolios/:id)
 */
export async function updatePortfolio(
  id: string,
  data: Partial<PortfolioFormData>,
  token: string
): Promise<PortfolioResponse> {
  return request<PortfolioResponse>(`/api/portfolios/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Retrieves all portfolios belonging to the authenticated user (GET /api/portfolios)
 */
export async function getPortfolios(
  token: string
): Promise<PortfoliosResponse> {
  return request<PortfoliosResponse>("/api/portfolios", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

import type {
  ProjectFormData,
  ProjectResponse,
  ProjectsResponse,
  DeleteProjectResponse,
} from "../types/project";


/**
 * Creates a new project under a portfolio for the authenticated user (POST /api/portfolios/:id/projects)
 */
export async function createProject(
  portfolioId: string,
  data: ProjectFormData,
  token: string
): Promise<ProjectResponse> {
  return request<ProjectResponse>(
    `/api/portfolios/${encodeURIComponent(portfolioId)}/projects`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }
  );
}

/**
 * Retrieves all projects belonging to a portfolio (GET /api/portfolios/:id/projects)
 */
export async function getProjects(
  portfolioId: string,
  token: string
): Promise<ProjectsResponse> {
  return request<ProjectsResponse>(
    `/api/portfolios/${encodeURIComponent(portfolioId)}/projects`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Retrieves a single project by ID (GET /api/projects/:id)
 */
export async function getProject(
  projectId: string,
  token: string
): Promise<ProjectResponse> {
  return request<ProjectResponse>(
    `/api/projects/${encodeURIComponent(projectId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Updates an existing project belonging to the authenticated user (PUT /api/projects/:id)
 */
export async function updateProject(
  projectId: string,
  data: Partial<ProjectFormData>,
  token: string
): Promise<ProjectResponse> {
  return request<ProjectResponse>(
    `/api/projects/${encodeURIComponent(projectId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }
  );
}

/**
 * Deletes a project belonging to the authenticated user (DELETE /api/projects/:id)
 */
export async function deleteProject(
  projectId: string,
  token: string
): Promise<DeleteProjectResponse> {
  return request<DeleteProjectResponse>(
    `/api/projects/${encodeURIComponent(projectId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}


