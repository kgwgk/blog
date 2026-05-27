import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          SUPABASE_JWT_SECRET: "test-jwt-secret-for-verification",
        },
        // Override assets directory to avoid loading large nix build artifacts
        // (wrangler.jsonc points ../result which may contain 50MB+ binaries)
        assets: { directory: path.join(__dirname, "test") },
      },
    }),
  ],
  test: {
    dir: "./test",
  },
});
