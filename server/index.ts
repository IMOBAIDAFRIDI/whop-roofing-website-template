import { handleApi } from "./handler";
import type { Env } from "./whop";

interface HostEnv extends Env {
  // Whop hosting binding that serves dist/client.
  ASSETS?: any;
}

/**
 * Whop hosting entry (dist/server/index.js). /api/* runs the API; everything
 * else is served from the static client build, with SPA fallback to
 * index.html so deep links like /crew work.
 */
export default {
  async fetch(request: Request, env: HostEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env as Env);
    }

    const assets = env?.ASSETS as { fetch(req: Request): Promise<Response> } | undefined;
    if (!assets) return new Response("Static assets binding unavailable", { status: 500 });

    const res = await assets.fetch(request);
    const wantsHtml = request.method === "GET" && (request.headers.get("accept") || "").includes("text/html");
    if (res.status === 404 && wantsHtml) {
      return assets.fetch(new Request(new URL("/index.html", url), request));
    }
    return res;
  },
};
