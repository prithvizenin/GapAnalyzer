// Evaluate an expression in a headless-Chrome page and print the result.
// Usage: node tmp_preview/probe.mjs <url> <expression> [delayMs] [screenshotOut]
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [url, expr, delayArg] = process.argv.slice(2);
const wait = Number(delayArg || 2500);
const port = 9700 + Math.floor(Math.random() * 200);
// Optional viewport override: PROBE_W=390 PROBE_H=844 node probe.mjs ...
const VW = Number(process.env.PROBE_W || 1440);
const VH = Number(process.env.PROBE_H || 1200);

const chrome = spawn(
  CHROME,
  ["--headless=new", "--disable-gpu", "--hide-scrollbars",
   `--remote-debugging-port=${port}`, `--window-size=${VW},${VH}`, "about:blank"],
  { stdio: "ignore" }
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 40; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find((t) => t.type === "page");
    if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
  } catch { /* not up */ }
  await sleep(250);
}
const ws = new WebSocket(wsUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
await new Promise((r) => { ws.onopen = r; });
await send("Page.enable");
await send("Runtime.enable");
if (process.env.PROBE_EMULATE || process.env.PROBE_W) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: VW, height: VH, deviceScaleFactor: 1, mobile: false,
  });
}
await send("Page.navigate", { url });
await sleep(wait);
const { result, exceptionDetails } = await send("Runtime.evaluate", {
  expression: expr,
  returnByValue: true,
});
console.log(exceptionDetails ? "ERROR: " + JSON.stringify(exceptionDetails) : result.value);
const shotOut = process.argv[5];
if (shotOut) {
  const shot = await send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 85,
    ...(process.env.PROBE_CLIP
      ? {
          captureBeyondViewport: true,
          clip: { x: 0, y: 0, width: 1440, height: 1300, scale: 1 },
        }
      : {}),
  });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(shotOut, Buffer.from(shot.data, "base64"));
  console.log("saved", shotOut);
}
ws.close();
chrome.kill();
process.exit(0);
