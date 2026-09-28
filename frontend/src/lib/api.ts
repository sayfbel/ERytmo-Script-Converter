/**
 * Centralized API helper ensuring consistent endpoints and credentials: "include"
 * for HttpOnly session cookie transmission across both desktop (PyWebView) and web modes.
 */

export const getApiUrl = (endpoint: string): string => {
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (typeof window !== "undefined") {
    // Relative URL guarantees same-origin cookie transmission in both localhost and production
    return clean;
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + clean;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = getApiUrl(endpoint);
  return fetch(url, {
    ...options,
    credentials: "include", // Ensures HttpOnly erytmo_token cookie is always sent
  });
};
