import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vitest/config";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const uploadSourceMaps = Boolean(sentryAuthToken);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(),
    sentryVitePlugin({
      org: "baoduong254",
      project: "trellify",
      authToken: sentryAuthToken,
      disable: !uploadSourceMaps,
      telemetry: false,
      release: { setCommits: false },
      sourcemaps: { filesToDeleteAfterUpload: ["dist/**/*.map"] },
    }),
  ],
  css: {
    devSourcemap: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    sourcemap: uploadSourceMaps ? "hidden" : false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    env: {
      VITE_API_ENDPOINT: "http://api.trellify.test",
      VITE_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.spec.{ts,tsx}", "src/test/**", "src/main.tsx", "src/**/*.d.ts"],
    },
  },
});
