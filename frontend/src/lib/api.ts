/** API base — NEXT_PUBLIC_API_URL overrides it for deployment (context.md §9).
 *  Shared by /upload, /rewrite and any future caller so the origin is defined
 *  once. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
