import path from "node:path";
import { fileURLToPath } from "node:url";

import nodeEslint from "@workspace/eslint/node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nodeEslint,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
];
