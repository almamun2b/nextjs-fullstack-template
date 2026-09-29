import { defineConfig } from "lint-staged/config";

export default defineConfig({
  "*.{ts,tsx,mts,cts,js,mjs,cjs}": [
    "eslint --fix --max-warnings=0 --no-warn-ignored",
    "prettier --write",
  ],
  "*.{json,md,css,yml,yaml}": "prettier --write",
});
