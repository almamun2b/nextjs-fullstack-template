import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "next-app-prisma",
    framework: "nextjs",
    env: ".env",
  },
});
