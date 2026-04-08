import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          SUPABASE_JWT_SECRET: "test-jwt-secret-for-verification",
        },
      },
    }),
  ],
  test: {
    dir: "./test",
  },
});
