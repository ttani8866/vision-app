// End-to-end runner.
// Usage: node scripts/run.mjs <slug>
// Requires out/<slug>/script.md to exist (Claude generates this from SKILL.md flow).
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
if (!fs.existsSync(scriptMd)) {
  console.error(`missing ${scriptMd}. write the narration script first.`);
  process.exit(1);
}

// Strip markdown headings/comments to plain narration text
const raw = fs.readFileSync(scriptMd, "utf8");
const text = raw
  .split("\n")
  .filter((l) => !l.startsWith("#") && !l.startsWith("<!--"))
  .join("\n")
  .replace(/\*\*/g, "")
  .trim();
const textFile = path.join(outDir, "narration.txt");
fs.writeFileSync(textFile, text);

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run(process.execPath, [path.join(ROOT, "scripts/tts.mjs"), textFile, outDir]);
run(process.execPath, [path.join(ROOT, "scripts/render.mjs"), slug]);
console.log(`done: ${path.join(outDir, "reel.mp4")}`);
