import type { NextConfig } from "next";

/**
 * Baseline security headers for every response.
 *
 * No CSP that needs a nonce: the only inline scripts are the theme boot script
 * in `layout.tsx` (which must run before paint, so it cannot be nonce-free
 * without making the layout dynamic) and Next's own hydration bootstrap. The
 * policy below is therefore permissive on `'unsafe-inline'` for scripts but
 * pins every fetch/connect/frame to the app itself plus the API origin, which
 * is where the real risk lives (the app renders user-supplied resume/JD text).
 *
 * `connect-src` includes NEXT_PUBLIC_API_URL because it is inlined at build
 * time; the localhost default is kept for local development.
 */
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  ""
);

const securityHeaders = [
  // Deny framing entirely — nothing here embeds the app and clickjacking a
  // page that can trigger uploads is not worth allowing.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next ships inline bootstrap + the theme boot script; styles are
      // Tailwind-inlined by the framework.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self' ${API_URL}`,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
