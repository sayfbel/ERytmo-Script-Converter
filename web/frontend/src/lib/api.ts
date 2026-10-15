export const getApiUrl = (endpoint: string): string => {
  if (!endpoint) return "";
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://") || endpoint.startsWith("blob:") || endpoint.startsWith("data:")) {
    return endpoint;
  }
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}${clean}`;
  }
  return `http://localhost:8000${clean}`;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = getApiUrl(endpoint);
  
  const headers = new Headers(options.headers || {});
  headers.set("ngrok-skip-browser-warning", "true");
  headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  headers.set("Pragma", "no-cache");

  return fetch(url, {
    cache: "no-store",
    ...options,
    credentials: "include",
    headers,
  });
};