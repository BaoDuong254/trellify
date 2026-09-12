import vitest from "@vitest/eslint-plugin";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    files: ["**/*.spec.{ts,tsx}", "**/test/**/*.{ts,tsx}", "**/src/test/**/*.{ts,tsx}"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/expect-expect": ["error", { assertFunctionNames: ["expect", "request.**.expect"] }],
      "vitest/consistent-test-it": ["error", { fn: "it" }],
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "warn",
    },
  },
];
