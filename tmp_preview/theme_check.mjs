// theme_check.mjs — end-to-end verification of ThemeToggle (DESIGN_SYSTEM §4 #23)
// and the §3.5 theme swap (radial reveal + legacy crossfade fallback), on every
// screen. The reveal path is proven by patching document.startViewTransition;
// the fallback path by deleting it for one click.
// Usage: node tmp_preview/theme_check.mjs   (frontend must be serving on :3100)
// Prints `check: PASS/FAIL …` + `facts: {…}` lines, saves theme-*.jpg.
// Exits non-zero if any check fails.
//
// Note: headless Chrome defaults to prefers-color-scheme: DARK — expectations
// are direction-aware (probed at startup, never assumed).

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.SHOT_BASE || "http://localhost:3100";
const W = 1440;
const H = 1200;
const LIGHT_BG = "rgb(246, 241, 231)"; // --paper light (#F6F1E7)
const DARK_BG = "rgb(25, 22, 18)"; // --paper dark (#191612)
const RAISED_LIGHT = "rgb(255, 253, 247)"; // --paper-raised light (#FFFDF7)
const RAISED_DARK = "rgb(34, 30, 24)"; // --paper-raised dark (#221E18)
const INK_LIGHT = "rgb(28, 26, 23)"; // body text light
const INK_DARK = "rgb(242, 237, 227)"; // body text dark

const port = 9300 + Math.floor(Math.random() * 400);
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--window-size=${W},${H}`,
    "about:blank",
  ],
  { stdio: "ignore" }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pageTargetUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error("CDP target never appeared");
}

const ws = new WebSocket(await pageTargetUrl());
let id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
};
await new Promise((r) => {
  ws.onopen = r;
});

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: W,
  height: H,
  deviceScaleFactor: 1,
  mobile: false,
});

async function evaluate(expression) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true, // sampler IIFEs return promises
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
}

let fails = 0;
function check(name, ok, detail = "") {
  console.log(`check: ${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) fails++;
}

function parseRgb(s) {
  const m = String(s).match(/\d+/g);
  return m ? m.slice(0, 3).map(Number) : null;
}
// True when each channel sits strictly between the two endpoint colors —
// i.e. the palette is mid-crossfade, not yet at either theme.
function strictlyBetween(mid, a, b) {
  const m = parseRgb(mid);
  const x = parseRgb(a);
  const y = parseRgb(b);
  if (!m || !x || !y) return false;
  return m.every((v, i) => v > Math.min(x[i], y[i]) && v < Math.max(x[i], y[i]));
}

// ——— headless defaults: probe, never assume ———
const SYS_DARK = JSON.parse(
  await evaluate(`matchMedia("(prefers-color-scheme: dark)").matches`)
);
console.log(`facts: ${JSON.stringify({ step: "headless system scheme", sysDark: SYS_DARK })}`);

/** Navigate and wait for the NEW document to commit (Page.frameNavigated,
 *  not the old document's body — same-URL reloads race a naive poll), then
 *  return html classes captured right after <body> exists: the inline boot
 *  script in <head> has run, React has not hydrated. */
async function goto(url) {
  const committed = new Promise((resolve) => {
    const handler = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (
        msg.method === "Page.frameNavigated" &&
        !msg.params.frame.parentId
      ) {
        ws.removeEventListener("message", handler);
        resolve(msg.params.frame.url);
      }
    };
    ws.addEventListener("message", handler);
    setTimeout(() => {
      ws.removeEventListener("message", handler);
      resolve("timeout");
    }, 10000);
  });
  await send("Page.navigate", { url });
  await committed;

  let early = "";
  for (let i = 0; i < 120; i++) {
    early = await evaluate(
      "document.body ? document.documentElement.className : ''"
    ).catch(() => "");
    if (early !== "") break;
    await sleep(25);
  }
  await sleep(1800); // hydration + fonts + GSAP mount
  return early;
}

// Scroll once so ScrollTrigger reveals fire (§3.5), back to top, settle.
async function scrollThrough() {
  await send("Runtime.evaluate", {
    expression: `(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < h; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
      return "scrolled";
    })()`,
    awaitPromise: true,
  });
}

async function facts() {
  return JSON.parse(
    await evaluate(`JSON.stringify({
      path: location.pathname,
      h1: (document.querySelector("h1") || {}).textContent?.trim() || "",
      dark: document.documentElement.classList.contains("dark"),
      anim: document.documentElement.classList.contains("theme-anim"),
      bg: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
      label: document.querySelector('button[aria-label^="Switch to"]')?.getAttribute("aria-label") || "",
      stored: localStorage.getItem("theme")
    })`)
  );
}

/** Distinct non-transparent background colors across the page — proves the
 *  sheets/cards actually repainted between themes (not just the body). */
async function palette() {
  return JSON.parse(
    await evaluate(`(() => {
      const seen = {};
      for (const el of document.querySelectorAll("*")) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          seen[bg] = (seen[bg] || 0) + 1;
        }
      }
      return JSON.stringify(seen);
    })()`)
  );
}

/** Full-page capture (bump viewport height, shoot, restore). */
async function snap(name, w = W, h = H, dsf = 1, mobile = false) {
  const fullH = Math.max(await evaluate("document.documentElement.scrollHeight"), h);
  await send("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: fullH,
    deviceScaleFactor: dsf,
    mobile,
  });
  await sleep(450);
  const shot = await send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 85,
  });
  writeFileSync(
    fileURLToPath(new URL(name, import.meta.url)),
    Buffer.from(shot.data, "base64")
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: h,
    deviceScaleFactor: dsf,
    mobile,
  });
  await sleep(250);
  console.log("saved", name, `${w}x${fullH}`);
}

/** Click the toggle and sample the crossfade frame-by-frame from inside the
 *  page (rAF drives the samples, so headless frame timing can't miss the
 *  interpolation the way a fixed sleep did). Returns { pre, samples, post }. */
async function toggleFlow(tag, { instant = false, forceFallback = false } = {}) {
  const pre = await facts();
  const toDark = !pre.dark;

  // Probe: count View Transition calls, and for the fallback run remove the
  // API entirely so the legacy crossfade is genuinely what executes.
  const probe = JSON.parse(
    await evaluate(`(() => {
      window.__vtCalls = 0;
      window.__vtSaved = document.startViewTransition;
      if (${forceFallback}) {
        document.startViewTransition = undefined;
      } else if (typeof document.startViewTransition === "function") {
        const orig = document.startViewTransition;
        document.startViewTransition = function (cb) {
          window.__vtCalls++;
          return orig.call(document, cb);
        };
      }
      return JSON.stringify({ supported: typeof window.__vtSaved === "function" });
    })()`)
  );

  const sampled = JSON.parse(
    await evaluate(`(async () => {
      const out = { samples: [], clips: [] };
      const t0 = performance.now();
      const push = () => {
        out.samples.push({
          t: Math.round(performance.now() - t0),
          bg: getComputedStyle(document.body).backgroundColor,
          anim: document.documentElement.classList.contains("theme-anim"),
          dur: parseFloat(getComputedStyle(document.body).transitionDuration)
        });
        try {
          const clip = getComputedStyle(
            document.documentElement,
            "::view-transition-new(root)"
          ).clipPath;
          if (clip && !out.clips.includes(clip)) out.clips.push(clip);
        } catch {}
      };
      document.querySelector('button[aria-label^="Switch to"]').click();
      await new Promise((done) => {
        const tick = () => {
          push();
          if (performance.now() - t0 < 560) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
        setTimeout(done, 1600); // page-side safety if rAF never runs
      });
      out.vtCalls = window.__vtCalls || 0;
      document.startViewTransition = window.__vtSaved;
      return JSON.stringify(out);
    })()`)
  );
  await sleep(200);
  const post = await facts();

  const samples = sampled.samples;
  const target = toDark ? DARK_BG : LIGHT_BG;
  const between = samples.filter((s) =>
    strictlyBetween(s.bg, LIGHT_BG, DARK_BG)
  );
  console.log(
    `facts: ${JSON.stringify({
      step: tag,
      pre: { path: pre.path, dark: pre.dark, bg: pre.bg, stored: pre.stored },
      samples: samples.map((s) => `${s.t}ms:${s.bg}`),
      post: { dark: post.dark, bg: post.bg, label: post.label, stored: post.stored, anim: post.anim },
    })}`
  );

  if (instant) {
    // Reduced motion: the swap must land on the first frame — no interpolation,
    // and no view transition either.
    check(`${tag}: instant duration (reduced motion)`, samples[0] && samples[0].dur < 0.01, `dur=${samples[0]?.dur}`);
    check(`${tag}: no interpolated palette`, between.length === 0, `between=${between.length}`);
    check(`${tag}: no view transition used`, sampled.vtCalls === 0, `vt=${sampled.vtCalls}`);
    const firstAt = samples.find((s) => s.bg === target);
    check(
      `${tag}: at target within 150ms (no easing ramp)`,
      Boolean(firstAt) && firstAt.t <= 150,
      `t=${firstAt ? firstAt.t : "n/a"}ms`
    );
  } else if (forceFallback || !probe.supported) {
    // No View Transitions: the §3.5 fallback crossfade must still animate.
    check(`${tag}: fallback uses the legacy crossfade`, samples[0]?.anim === true);
    check(`${tag}: fallback crossfade 220ms`, Math.abs(samples[0].dur - 0.22) < 0.015, `dur=${samples[0]?.dur}`);
    check(
      `${tag}: fallback palette interpolates`,
      between.length >= 2,
      `between=${between.length} first=${between[0]?.t}ms`
    );
    check(`${tag}: fallback skips view transition`, sampled.vtCalls === 0, `vt=${sampled.vtCalls}`);
  } else {
    // View Transitions: exactly one reveal, and no per-element crossfade under it.
    check(`${tag}: view transition ran exactly once`, sampled.vtCalls === 1, `vt=${sampled.vtCalls}`);
    check(
      `${tag}: reveal leaves no legacy crossfade`,
      samples.every((s) => !s.anim),
      `anim_frames=${samples.filter((s) => s.anim).length}`
    );
    check(`${tag}: palette lands on target`, post.bg === target, post.bg);
    if (sampled.clips.length) {
      check(
        `${tag}: reveal clip-path animates`,
        sampled.clips.length >= 3,
        `clip frames=${sampled.clips.length}`
      );
    } else {
      console.log(
        `facts: ${JSON.stringify({ step: tag, clips: "pseudo-element style not exposed in this Chrome" })}`
      );
    }
  }

  check(`${tag}: theme flipped`, post.dark === toDark && post.bg === target, post.bg);
  check(`${tag}: theme-anim removed after swap`, post.anim === false);
  check(
    `${tag}: aria-label flipped`,
    post.label === (toDark ? "Switch to light mode" : "Switch to dark mode"),
    post.label
  );
  check(`${tag}: localStorage persisted`, post.stored === (toDark ? "dark" : "light"));
  return post;
}

/** Palette + text-color proof for the settled theme on this page. */
function checkPalette(tag, dark) {
  return palette().then((p) => {
    console.log(`facts: ${JSON.stringify({ step: `${tag} palette`, ...p })}`);
    if (dark) {
      check(`${tag} dark: sheets use dark paper-raised`, (p[RAISED_DARK] || 0) > 0);
      check(`${tag} dark: no light paper-raised left`, !(RAISED_LIGHT in p));
    } else {
      check(`${tag} light: sheets use light paper-raised`, (p[RAISED_LIGHT] || 0) > 0);
      check(`${tag} light: no dark paper-raised left`, !(RAISED_DARK in p));
    }
  });
}

// ——————————————————————————— page walk ———————————————————————————
// Headless default is dark, so: fresh visit starts dark per system; each page
// then toggles to the opposite theme, carrying storage across navigations.

// P1: fresh visit (no storage) — boot must follow the system scheme
const early1 = await goto(`${BASE}/`);
check(
  "boot: fresh visit follows system scheme pre-hydration",
  early1.includes("dark") === SYS_DARK,
  early1.includes("dark") ? "dark" : "light"
);
await scrollThrough();
let f = await facts();
console.log(`facts: ${JSON.stringify({ step: "landing start", ...f })}`);
check("landing: starts on system theme", f.dark === SYS_DARK && f.stored === null, f.bg);
await snap(`theme-01-landing-${f.dark ? "dark" : "light"}.jpg`);
await checkPalette("landing", f.dark);
let post = await toggleFlow("landing toggle");
await snap(`theme-02-landing-${post.dark ? "dark" : "light"}.jpg`);
await checkPalette("landing", post.dark);

// Reload: boot script must re-apply the stored theme pre-hydration (no flash)
const early2 = await goto(`${BASE}/`);
check(
  "boot: stored theme applied pre-hydration",
  early2.includes("dark") === (post.stored === "dark"),
  post.stored
);

// P2: /upload inherits storage; toggle opposite
await goto(`${BASE}/upload`);
f = await facts();
check(
  "upload: route + theme carried from storage",
  f.path === "/upload" && f.dark === (post.stored === "dark") && f.bg === (post.stored === "dark" ? DARK_BG : LIGHT_BG),
  `${f.path} ${f.bg}`
);
await scrollThrough();
await snap(`theme-03-upload-${f.dark ? "dark" : "light"}.jpg`);
post = await toggleFlow("upload toggle");
await snap(`theme-04-upload-${post.dark ? "dark" : "light"}.jpg`);
// Forced fallback: the same swap with the View Transitions API removed.
post = await toggleFlow("upload fallback toggle", { forceFallback: true });

// P3: /results
await goto(`${BASE}/results`);
f = await facts();
check(
  "results: route + theme carried from storage",
  f.path === "/results" && f.dark === (post.stored === "dark"),
  `${f.path} ${f.bg}`
);
await scrollThrough();
await snap(`theme-05-results-${f.dark ? "dark" : "light"}.jpg`);
post = await toggleFlow("results toggle");
await snap(`theme-06-results-${post.dark ? "dark" : "light"}.jpg`);
await checkPalette("results", post.dark);

// P4: /report
await goto(`${BASE}/report`);
f = await facts();
check(
  "report: route + theme carried from storage",
  f.path === "/report" && f.dark === (post.stored === "dark"),
  `${f.path} ${f.bg}`
);
await scrollThrough();
await snap(`theme-07-report-${f.dark ? "dark" : "light"}.jpg`);
post = await toggleFlow("report toggle");
await snap(`theme-08-report-${post.dark ? "dark" : "light"}.jpg`);

// System-follow, both directions: no stored preference → scheme wins
await evaluate(`localStorage.removeItem("theme"); "ok"`);
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "light" }],
});
let early = await goto(`${BASE}/`);
check("boot: follows prefers-color-scheme light", !early.includes("dark"), early.includes("dark") ? "dark" : "light");
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "dark" }],
});
early = await goto(`${BASE}/`);
check("boot: follows prefers-color-scheme dark", early.includes("dark"), early.includes("dark") ? "dark" : "light");
await send("Emulation.setEmulatedMedia", { features: [] });

// Reduced motion: swap must be instant (theme-anim rule media-gated)
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await goto(`${BASE}/`);
f = await facts();
check("reduced-motion: starts on system theme", f.dark === SYS_DARK && f.stored === null, f.bg);
post = await toggleFlow("reduced-motion toggle", { instant: true });
await send("Emulation.setEmulatedMedia", { features: [] });

// Mobile (390×844): toggle present, ≥44px, fully on-screen; both themes shot
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await goto(`${BASE}/results`);
await scrollThrough();
const rect = JSON.parse(
  await evaluate(`JSON.stringify((() => {
    const r = document.querySelector('button[aria-label^="Switch to"]').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight };
  })())`)
);
f = await facts();
console.log(`facts: ${JSON.stringify({ step: "mobile", theme: f.dark ? "dark" : "light", ...rect })}`);
check(
  "mobile: toggle ≥44px and fully on-screen",
  rect.w >= 44 && rect.h >= 44 && rect.x + rect.w <= rect.vw + 1 && rect.y + rect.h <= rect.vh + 1,
  JSON.stringify(rect)
);
await snap(`theme-09-mobile-results-${f.dark ? "dark" : "light"}.jpg`, 390, 844, 2, true);
post = await toggleFlow("mobile toggle");
await snap(`theme-10-mobile-results-${post.dark ? "dark" : "light"}.jpg`, 390, 844, 2, true);

// Cleanup
await evaluate(`localStorage.removeItem("theme"); "ok"`).catch(() => {});
console.log(fails === 0 ? "\nALL CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`);
ws.close();
chrome.kill();
process.exit(fails === 0 ? 0 : 1);
