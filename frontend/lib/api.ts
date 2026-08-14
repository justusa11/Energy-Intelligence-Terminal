const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

type ApiRequestOptions = {
  retries?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    repair_hint?: string;
  };
  detail?: string;
};

export async function apiGet<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return requestJson<T>(path, { method: "GET" }, options);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  options: ApiRequestOptions = {}
): Promise<T> {
  return requestJson<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options
  );
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  { retries = 1, signal, timeoutMs = 8000 }: ApiRequestOptions
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const abortListener = () => controller.abort();
    signal?.addEventListener("abort", abortListener, { once: true });

    try {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await getApiErrorMessage(response);
        if (response.status < 500 || attempt === retries) {
          throw new Error(message);
        }
        lastError = new Error(message);
      } else {
        return response.json() as Promise<T>;
      }
    } catch (error) {
      if (signal?.aborted) {
        throw new Error("API request cancelled");
      }
      if (attempt === retries) {
        throw error instanceof Error ? error : new Error("Unknown API error");
      }
      lastError = error instanceof Error ? error : new Error("Unknown API error");
    } finally {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", abortListener);
    }
  }

  throw lastError ?? new Error("Unknown API error");
}

async function getApiErrorMessage(response: Response): Promise<string> {
  const fallback = `API request failed: ${response.status} ${response.statusText}`;
  try {
    const payload = (await response.clone().json()) as ApiErrorEnvelope;
    if (payload.error?.message) {
      return payload.error.repair_hint
        ? `${payload.error.message} ${payload.error.repair_hint}`
        : payload.error.message;
    }
    if (payload.detail) {
      return payload.detail;
    }
  } catch {
    // Non-JSON errors still use the HTTP status fallback.
  }
  return fallback;
}
