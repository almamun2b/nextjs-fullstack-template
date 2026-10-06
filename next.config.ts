import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const root = import.meta.dirname;

// Static security headers (ARCHITECTURE.md §11). The nonce-based CSP comes
// with src/proxy.ts, because it needs a fresh value per request.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const hsts = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
};

export default function config(phase: string): NextConfig {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    output: "standalone",
    outputFileTracingRoot: root,
    turbopack: { root },
    poweredByHeader: false,
    typedRoutes: true,
    headers() {
      return Promise.resolve([
        {
          source: "/:path*",
          headers: isDevServer ? securityHeaders : [...securityHeaders, hsts],
        },
      ]);
    },
  };
}
