const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const cleanApiUrl = rawApiUrl.endsWith("/") ? rawApiUrl.slice(0, -1) : rawApiUrl;

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanApiUrl.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${cleanApiUrl}${normalizedPath.slice(4)}`;
  }
  return `${cleanApiUrl}${normalizedPath}`;
}

export class ApiRequestError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = "";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || JSON.stringify(errorJson);
    } catch {
      errorDetail = response.statusText;
    }
    throw new ApiRequestError(
      response.status,
      errorDetail || `API request failed with status ${response.status}`,
      errorDetail
    );
  }
  return response.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, data?: any): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    body: formData,
  });
  return handleResponse<T>(response);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });
  return handleResponse<T>(response);
}

export const API_URL = cleanApiUrl;


