import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { whop } from "@whop/cli/vite";

/**
 * Whop hosting runs on Cloudflare Workers.
 *  - client environment → dist/client (the React site)
 *  - ssr environment    → dist/server (server/index.ts worker: /api/* + assets)
 * The whop() plugin packs both into dist/whop-build.zip for `whop apps deploy`.
 * In `whop apps dev` the same worker runs locally, so /api/* behaves identically.
 */
export default defineConfig({
  plugins: [whop(), cloudflare({ viteEnvironment: { name: "ssr" } }), react()],
  environments: {
    client: { build: { outDir: "dist/client" } },
    ssr: { build: { outDir: "dist/server" } },
  },
});
