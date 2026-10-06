import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "next-app-prisma",
    framework: "nextjs",
    // Production values only. Never point this at .env: local commands read
    // that file, and a prod URL there sends migrations and seeds to prod.
    env: ".env.compute",
  },
});
