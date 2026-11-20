// Drift-check screenshot helper — drives headless Chrome over CDP (no deps).
// Usage: node tmp_preview/shot.mjs <url> <out.jpg> <width> <height> [fill|analyze|badfile|real] [delayMs]
//   fill    = inject resume.pdf (245 KB dummy) + JD text (shows FileChip + enabled CTA)
//   analyze = fill (real fixture when present), submit, wait <delayMs> (default 1500), shoot analyzing state
//   badfile = inject resume.exe → client type error (pre-submit)
//   real    = E2E journey: real fixture PDF + SHOT_JD, submit, wait for the
//             handoff to /results, shoot the REAL results screen
//   rewrite = real journey, then /report → "Tailor my resume" → waits for the
//             tailored-resume review (LLM latency allowed), shoots /rewrite
//   compare = real journey, then "Compare other postings" → fills postings
//             02/03 → waits for the ranked cards, shoots /compare
// Env: SHOT_FILE (fixture PDF, default ./tmp_preview/fixtures/resume.pdf)
//      SHOT_JD   (job-description text file, default = the upload placeholder)
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [url, out, w, h, actionArg, delayArg] = process.argv.slice(2);
const width = Number(w || 1440);
const height = Number(h || 1200);
const action = actionArg || "none";
const delay = Number(delayArg || 1500);
const dsf = width < 700 ? 2 : 1;

const FIXTURE_PDF = process.env.SHOT_FILE
  ? process.env.SHOT_FILE
  : fileURLToPath(new URL("./fixtures/resume.pdf", import.meta.url));
const JD_TEXT = process.env.SHOT_JD
  ? readFileSync(process.env.SHOT_JD, "utf8")
  : "We are looking for a Frontend Developer with strong React skills, experience in building responsive web applications, and a solid understanding of modern JavaScript, HTML, and CSS.";
if (action === "real" && !existsSync(FIXTURE_PDF)) {
  console.error(`real mode: fixture PDF not found at ${FIXTURE_PDF}`);
  process.exit(1);
}

const port = 9300 + Math.floor(Math.random() * 400);
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
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
  width,
  height,
  deviceScaleFactor: dsf,
  mobile: width < 700,
});
await send("Page.navigate", { url });
// Wait for hydration: poll for the form controls, then a beat for fonts.
for (let i = 0; i < 40; i++) {
  const ready = await evaluate(
    "Boolean(document.querySelector('input[type=file]') && document.getElementById('jd'))"
  ).catch(() => false);
  if (ready) break;
  await sleep(250);
}
await sleep(1500);

async function evaluate(expression) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
}

if (
  action === "fill" ||
  action === "analyze" ||
  action === "badfile" ||
  action === "real" ||
  action === "rewrite" ||
  action === "compare"
) {
  const useFixture =
    (action === "real" ||
      action === "analyze" ||
      action === "rewrite" ||
      action === "compare") &&
    existsSync(FIXTURE_PDF);
  const fileArg =
    action === "badfile"
      ? "new File([new Uint8Array(245 * 1024)], 'resume.exe', { type: 'application/octet-stream' })"
      : useFixture
        ? `new File([(() => { const bin = atob(${JSON.stringify(readFileSync(FIXTURE_PDF, "base64"))}); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; })()], 'resume.pdf', { type: 'application/pdf' })`
        : "new File([new Uint8Array(245 * 1024)], 'resume.pdf', { type: 'application/octet-stream' })";

  const r1 = await evaluate(`(() => {
    const input = document.querySelector('input[type=file]');
    if (!input) return 'no input';
    const dt = new DataTransfer();
    dt.items.add(${fileArg});
    Object.defineProperty(input, 'files', { configurable: true, get: () => dt.files });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return 'ok';
  })()`);
  await sleep(300);
  const r2 = await evaluate(`(() => {
    const ta = document.getElementById('jd');
    if (!ta) return 'no textarea';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, ${JSON.stringify(JD_TEXT)});
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return 'ok';
  })()`);
  await sleep(400);
  if (r1 !== "ok" || r2 !== "ok") console.log("warn:", r1, r2);

  if (action === "analyze") {
    await evaluate(
      `document.querySelector('button[type=submit]').click(); 'clicked'`
    );
    await sleep(delay);
  }

  if (action === "real") {
    await evaluate(
      `document.querySelector('button[type=submit]').click(); 'clicked'`
    );
    let path = "";
    for (let i = 0; i < 80; i++) {
      path = await evaluate("location.pathname").catch(() => "");
      if (path === "/results") break;
      await sleep(250);
    }
    if (path !== "/results") {
      console.error(`never reached /results (stuck on ${path})`);
      process.exitCode = 1;
    }
    await sleep(1200); // stamp settle + fonts
  }

  if (action === "compare") {
    await evaluate(
      `document.querySelector('button[type=submit]').click(); 'clicked'`
    );
    let path = "";
    for (let i = 0; i < 80; i++) {
      path = await evaluate("location.pathname").catch(() => "");
      if (path === "/results") break;
      await sleep(250);
    }
    if (path !== "/results") {
      console.error(`never reached /results (stuck on ${path})`);
      process.exitCode = 1;
    }
    await sleep(800);

    const opened = await evaluate(`(() => {
      const link = [...document.querySelectorAll('a')].find(
        (el) => /compare other postings/i.test(el.textContent || '')
      );
      if (!link) return 'no cta';
      link.click();
      return 'clicked';
    })()`);
    if (opened !== "clicked") {
      console.error("compare journey: " + opened);
      process.exitCode = 1;
    }
    for (let i = 0; i < 40; i++) {
      path = await evaluate("location.pathname").catch(() => "");
      if (path === "/compare") break;
      await sleep(250);
    }
    await sleep(600);

    const extraPostings = [
      "Frontend Developer\nWe are looking for a React frontend developer with strong JavaScript, HTML, CSS and TypeScript skills. Docker and CI/CD experience is a plus.",
      "Data Analyst\nSQL, Python, dashboards, stakeholder communication and reporting.",
    ];
    for (let slot = 0; slot < extraPostings.length; slot++) {
      const filled = await evaluate(`(() => {
        const ta = document.getElementById('posting-${slot + 1}');
        if (!ta) return 'no field';
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, ${JSON.stringify(extraPostings[slot])});
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        return 'ok';
      })()`);
      if (filled !== "ok") {
        console.error("compare fill: " + filled);
        process.exitCode = 1;
      }
    }
    await sleep(400);
    await evaluate(
      `document.querySelector('button[type=submit]').click(); 'clicked'`
    );

    for (let i = 0; i < 160; i++) {
      const settled = await evaluate(`(() => {
        const text = document.body.innerText || '';
        return /ranked postings/i.test(text) || text.includes('Comparison failed');
      })()`).catch(() => false);
      if (settled) break;
      await sleep(500);
    }
    if (path !== "/compare") {
      console.error(`never reached /compare (stuck on ${path})`);
      process.exitCode = 1;
    }
  }

  if (action === "rewrite") {
    await evaluate(
      `document.querySelector('button[type=submit]').click(); 'clicked'`
    );
    let path = "";
    for (let i = 0; i < 80; i++) {
      path = await evaluate("location.pathname").catch(() => "");
      if (path === "/results") break;
      await sleep(250);
    }
    if (path !== "/results") {
      console.error(`never reached /results (stuck on ${path})`);
      process.exitCode = 1;
    }
    await sleep(600);

    await evaluate("location.href = '/report'; 'nav'");
    await sleep(1600);
    const clicked = await evaluate(`(() => {
      const link = [...document.querySelectorAll('a')].find(
        (el) => /tailor my resume/i.test(el.textContent || '')
      );
      if (!link) return 'no cta';
      link.click();
      return 'clicked';
    })()`);
    if (clicked !== "clicked") {
      console.error("rewrite journey: " + clicked);
      process.exitCode = 1;
    }

    // Allow for LLM latency: wait until the review (or an error) renders.
    for (let i = 0; i < 120; i++) {
      path = await evaluate("location.pathname").catch(() => "");
      const settled = await evaluate(`(() => {
        const text = document.body.innerText || '';
        return text.includes('Download DOCX') || text.includes('Rewrite failed')
          || text.includes('Upload a resume and a job posting first');
      })()`).catch(() => false);
      if (path === "/rewrite" && settled) break;
      await sleep(500);
    }
    if (path !== "/rewrite") {
      console.error(`never reached /rewrite (stuck on ${path})`);
      process.exitCode = 1;
    }
  }
}

// Scroll the page once so ScrollTrigger reveals fire (§3.5 motion), then
// return to the top and let the sequences finish before facts/capture.
await send("Runtime.evaluate", {
  expression: `(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 130));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 500));
    return "scrolled";
  })()`,
  awaitPromise: true,
});

// Text facts (trustworthy regardless of screenshot attachment) — logged for every mode.
const facts = await evaluate(`JSON.stringify({
  path: location.pathname,
  h1: document.querySelector('h1')?.textContent?.trim() || '',
  stamp: document.querySelector('[role="img"]')?.getAttribute('aria-label') || '',
  text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 600)
})`);
console.log('facts:', facts);

// Full-page capture: bump the emulated viewport to full height and take a
// plain screenshot. (captureBeyondViewport + clip occasionally drops freshly-
// animated elements — e.g. the hero GOOD MATCH stamp — while reporting them
// visible via evaluate. See context.md §0 "probe.mjs" gotcha.)
const fullH = Math.max(
  await evaluate("document.documentElement.scrollHeight"),
  height
);
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: fullH,
  deviceScaleFactor: dsf,
  mobile: width < 700,
});
await sleep(400); // re-raster at the new height
const shot = await send("Page.captureScreenshot", {
  format: "jpeg",
  quality: 85,
});
writeFileSync(out, Buffer.from(shot.data, "base64"));
console.log("saved", out, `${width}x${fullH}`);
ws.close();
chrome.kill();
process.exit(process.exitCode ?? 0);
