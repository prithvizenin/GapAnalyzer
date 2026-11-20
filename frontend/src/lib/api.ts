/** API base — NEXT_PUBLIC_API_URL overrides it for deployment (context.md §9).
 *  Shared by /upload, /rewrite and any future caller so the origin is defined
 *  once. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Where the user's own Gemini key lives (DESIGN_SYSTEM §4 #25).
 *  sessionStorage, not localStorage: the secret dies with the tab, and it is
 *  never persisted server-side — /rewrite forwards it per request only. */
export const API_KEY_STORAGE = "gemini_api_key";

/** Read the key the tailor dialog stored ("" when none / storage blocked). */
export function readApiKey(): string {
  try {
    return window.sessionStorage.getItem(API_KEY_STORAGE)?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Store (or clear, with "") the key for this tab. */
export function saveApiKey(key: string): void {
  try {
    if (key.trim()) window.sessionStorage.setItem(API_KEY_STORAGE, key.trim());
    else window.sessionStorage.removeItem(API_KEY_STORAGE);
  } catch {
    /* storage blocked — the next request simply travels without a key */
  }
}
