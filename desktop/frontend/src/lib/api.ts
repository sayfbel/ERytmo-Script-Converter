export const getApiUrl = (endpoint: string): string => {
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}${clean}`;
  }
  return `http://localhost:8000${clean}`;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = getApiUrl(endpoint);
  
  // Retrieve token from localStorage if present (for cross-domain cloud hosting support)
  const token = typeof window !== "undefined" ? localStorage.getItem("erytmo_token") : null;
  
  const headers = new Headers(options.headers || {});
  headers.set("ngrok-skip-browser-warning", "true");
  headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  headers.set("Pragma", "no-cache");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    cache: "no-store",
    ...options,
    credentials: "include",
    headers,
  });
};