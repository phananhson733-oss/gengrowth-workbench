import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The vendored engine tests run unchanged; the API tests sit beside the app.
    include: ["vendor/nevermore/**/*.test.ts", "apps/api/test/**/*.test.ts"],
    environment: "node",
  },
});
