import nodePlugin from "eslint-plugin-n";
import pluginPromise from "eslint-plugin-promise";
import pluginSecurity from "eslint-plugin-security";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";

import baseConfig from "./base.js";
import vitestConfig from "./vitest.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  pluginPromise.configs["flat/recommended"],
  eslintPluginUnicorn.configs.recommended,
  pluginSecurity.configs.recommended,
  nodePlugin.configs["flat/recommended-script"],
  ...vitestConfig,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-extraneous-class": "off",
      "n/no-missing-import": "off",
      "security/detect-object-injection": "off",
      "unicorn/prefer-top-level-await": "off",
      "unicorn/no-null": "off",
      "unicorn/max-nested-calls": "off",
      "unicorn/no-top-level-side-effects": "off",
      "unicorn/no-top-level-assignment-in-function": "off",
    },
  },
];
