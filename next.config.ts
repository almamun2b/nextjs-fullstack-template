import type { NextConfig } from "next";

const root = import.meta.dirname;

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
