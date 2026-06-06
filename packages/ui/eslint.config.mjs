import path from "node:path";
import { fileURLToPath } from "node:url";

import reactEslint from "@workspace/eslint/react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...reactEslint,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "react-refresh/only-export-components": ["off", { allowConstantExport: true }],
    },
  },
];
