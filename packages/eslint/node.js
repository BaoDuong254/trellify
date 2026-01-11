import globals from "globals";
import jestPlugin from "eslint-plugin-jest";
import pluginPromise from "eslint-plugin-promise";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import pluginSecurity from "eslint-plugin-security";
import nodePlugin from "eslint-plugin-n";
import baseConfig from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  pluginPromise.configs["flat/recommended"],
  eslintPluginUnicorn.configs.recommended,
  pluginSecurity.configs.recommended,
  nodePlugin.configs["flat/recommended-script"],
  {
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-extraneous-class": "off",
      "n/no-missing-import": "off",
      "security/detect-object-injection": "off",
    },
  },
];
