import js from "@eslint/js";
import tseslint from "typescript-eslint";
import tsdoc from "eslint-plugin-tsdoc";
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import eslintPlugin from "eslint-plugin-eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default [
  {
    ignores: ["**/eslint.config.mjs", "**/dist", "**/node_modules", "**/generated", "**/coverage", "**/vite.config.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslint.configs.recommended,
  eslintPlugin.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: "latest",
      parser: tseslint.parser,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
      tsdoc: tsdoc,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: ["./tsconfig.json", "packages/*/tsconfig.json", "apps/*/tsconfig.json"],
        },
      },
    },
    rules: {
      ...importPlugin.configs["recommended"].rules,
      "tsdoc/syntax": "warn",
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "no-lonely-if": "error",
    },
  },
];
