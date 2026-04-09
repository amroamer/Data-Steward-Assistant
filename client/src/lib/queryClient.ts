import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";

function dispatchApiError(detail: {
  message: string;
  status: number | null;
  endpoint: string;
  aiProvider: string;
  timestamp: string;
}) {
  window.dispatchEvent(new CustomEvent("api-error", { detail }));
}

async function throwIfResNotOk(res: Response, url?: string) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.clone().json();
      message = body.message || body.error || message;
    } catch {
      try { message = (await res.clone().text()) || message; } catch {}
    }

    dispatchApiError({
      message,
      status: res.status,
      endpoint: url ?? res.url,
      aiProvider: sessionStorage.getItem("ai-provider") ?? "claude",
      timestamp: new Date().toISOString(),
    });

    throw new Error(`${res.status}: ${message}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(apiUrl(url), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res, url);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const res = await fetch(apiUrl(url), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res, url);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
