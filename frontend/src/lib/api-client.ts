import type { ApiErrorBody } from "./types";

/** An error answer from the API, with one message per invalid field when there are some. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/**
 * Calls from the browser. They go to /api on our own domain; the Next.js route
 * app/api/[...path]/route.ts forwards them to Symfony.
 */
export async function api<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const method = init.method ?? (init.body !== undefined || init.form ? "POST" : "GET");
  const headers: Record<string, string> = {
    Accept: "application/json",
    // Required by the API for every admin request that changes data (CSRF protection).
    "X-Requested-With": "dz-store",
  };
  let body: BodyInit | undefined;
  if (init.form) {
    body = init.form;
  } else if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }

  let response: Response;
  try {
    response = await fetch(path, { method, headers, body, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiError(0, "Network error. Check your connection.");
  }

  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error = (data ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(response.status, error.error ?? `Error ${response.status}`, error.fields ?? {});
  }
  return data as T;
}
