import { config as baseConfig } from "@otim/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    rules: {
      "import/no-default-export": "off",
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    ignores: ["dist/**", "build/**", "node_modules/**", "*.config.*"],
  },
];
