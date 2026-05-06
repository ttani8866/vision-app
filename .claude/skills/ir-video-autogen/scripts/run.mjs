// End-to-end IR video runner.
// Usage: node scripts/run.mjs <slug>
// Requires out/<slug>/script.md and out/<slug>/meta.json (company/period/highlights/disclaimer).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const slug = process.argv[2];
if (!slug) {
  console.error("usage: run.mjs <slug>");
  process.exit(1);
}
const outDir = path.resolve(ROOT, "out", slug);
const scriptMd = path.join(outDir, "script.md");
const metaJson = path.join(outDir, "meta.json");
if (!fs.existsSync(scriptMd)) {
  console.error(`missing ${scriptMd}. write the narration script first.`);
  process.exit(1);
}
if (!fs.existsSync(metaJson)) {
  console.error(`missing ${metaJson}. write company/period/highlights metadata first.`);
  process.exit(1);
}

// Strip headings/comments → plain narration (auto-append disclaimer).
const meta = JSON.parse(fs.readFileSync(metaJson, "utf8"));
const raw = fs.readFileSync(scriptMd, "utf8");
let text = raw
  .split("\n")
  .filter((l) => !l.startsWith("#") && !l.startsWith("<!--"))
  .join("\n")
  .replace(/\*\*/g, "")
  .trim();
const disclaimer =
  meta.disclaimer ||
  "本動画は開示資料を要約したものであり、投資勧誘を目的とするものではありません。";
if (!text.includes("投資勧誘")) {
  text += `\n${disclaimer}`;
}
const textFile = path.join(outDir, "narration.txt");
fs.writeFileSync(textFile, text);

const run = (args) => {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run([path.join(ROOT, "scripts/tts.mjs"), textFile, outDir]);
run([path.join(ROOT, "scripts/render.mjs"), slug]);
console.log(`done: ${path.join(outDir, "video.mp4")}`);
