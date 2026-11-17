/**
 * Minimal Whop REST client for the hosted runtime.
 *
 * Production (deployed with `whop apps deploy`): outbound requests to
 * WHOP_API_ORIGIN are signed by Whop's hosting proxy with the app's own key,
 * so no key is ever read or stored by this code.
 *
 * Local dev (`whop apps dev`): WHOP_API_KEY is injected, and we send it.
 *
 * Sandbox: set WHOP_ENVIRONMENT=sandbox plus SANDBOX_API_KEY and
 * SANDBOX_ACCOUNT_ID secrets; requests go to sandbox-api.whop.com with that
 * key and the proxy is told not to inject the production key.
 */

export type Env = Record<string, string | undefined>;

export type WhopEnvironment = "production" | "sandbox";

export interface WhopContext {
  environment: WhopEnvironment;
  accountId: string;
  request<T = any>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T>;
}

export class WhopApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    public path: string,
  ) {
    super(`Whop API ${status} on ${path}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
}

const API_VERSION_DATE = "2026-11-16-2";

export function readEnv(env: Env | undefined): Env {
  const fromProcess: Env =
    typeof process !== "undefined" && process?.env ? (process.env as Env) : {};
  return { ...fromProcess, ...(env ?? {}) };
}

export function createWhop(rawEnv: Env | undefined): WhopContext {
  const env = readEnv(rawEnv);
  const environment: WhopEnvironment = env.WHOP_ENVIRONMENT === "sandbox" ? "sandbox" : "production";

  const origin =
    environment === "sandbox"
      ? "https://sandbox-api.whop.com"
      : (env.WHOP_API_ORIGIN || "https://api.whop.com").replace(/\/$/, "");

  const apiKey = environment === "sandbox" ? env.SANDBOX_API_KEY : env.WHOP_API_KEY;
  const accountId =
    (environment === "sandbox" ? env.SANDBOX_ACCOUNT_ID : env.ACCOUNT_ID || env.WHOP_ACCOUNT_ID) || "";

  async function request<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Api-Version-Date": API_VERSION_DATE,
    };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    if (environment === "sandbox") headers["x-whop-inject-key"] = "none";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    const res = await fetch(`${origin}/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* keep raw text */
    }
    if (!res.ok) throw new WhopApiError(res.status, parsed, path);
    return parsed as T;
  }

  return { environment, accountId, request };
}
