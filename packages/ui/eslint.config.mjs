import reactEslint from "@workspace/eslint/react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
