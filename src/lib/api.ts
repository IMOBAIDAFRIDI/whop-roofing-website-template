import type { PlanKey } from "../site.config";

export interface RuntimeConfig {
  environment: "production" | "sandbox";
  accountId: string;
  plans: Record<PlanKey, string>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown; adminKey?: string }): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) headers.set("Content-Type", "application/json");
  if (init?.adminKey) headers.set("x-admin-key", init.adminKey);
  const res = await fetch(path, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as any)?.error || `Request failed (${res.status})`, res.status, (data as any)?.detail);
  return data as T;
}

let configPromise: Promise<RuntimeConfig> | null = null;
export function loadConfig() {
  configPromise ??= api<RuntimeConfig>("/api/config").catch((err) => {
    configPromise = null;
    throw err;
  });
  return configPromise;
}
