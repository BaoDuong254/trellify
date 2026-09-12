import { defineConfig } from "vitest/config";

const TEST_ENVIRONMENT = {
  NODE_ENV: "test",
  LOG_LEVEL: "error",
  PORT: "3999",
  CLIENT_URL: "http://localhost:5173",
  MONGODB_URI: "mongodb://127.0.0.1:1",
  DATABASE_NAME: "trellify_test",
  BREVO_API_KEY: "test-brevo-key",
  ADMIN_EMAIL_ADDRESS: "admin@trellify.test",
  ADMIN_EMAIL_NAME: "Trellify Test",
  ACCESS_TOKEN_SECRET_SIGNATURE: "test-access-token-secret",
  ACCESS_TOKEN_LIFE: "1h",
  REFRESH_TOKEN_SECRET_SIGNATURE: "test-refresh-token-secret",
  REFRESH_TOKEN_LIFE: "14d",
  COOKIE_MAX_AGE: "14d",
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
  REDIS_URL: "redis://127.0.0.1:1",
  QUEUE_PREFIX: "trellify-test",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    env: TEST_ENVIRONMENT,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/types/**"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.spec.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/integration/**/*.spec.ts"],
          globalSetup: ["test/integration/setup/global-setup.ts"],
          setupFiles: ["test/integration/setup/environment.ts", "test/integration/setup/lifecycle.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 180_000,
        },
      },
    ],
  },
});
