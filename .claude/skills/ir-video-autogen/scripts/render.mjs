// Render IR video using Remotion programmatic API.
// Usage: node scripts/render.mjs <slug> [template=earnings-3min]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const [, , slug, templateArg] = process.argv;
if (!slug) {
  console.error("usage: render.mjs <slug> [template=earnings-3min]");
  process.exit(1);
}
const template = templateArg || "earnings-3min";

const outDir = path.resolve(ROOT, "out", slug);
const tmplDir = path.resolve(ROOT, "templates", template);
const captions = path.join(outDir, "captions.json");
const voice = path.join(outDir, "voice.mp3");
const meta = path.join(outDir, "meta.json");
if (!fs.existsSync(captions) || !fs.existsSync(voice)) {
  console.error("missing tts artifacts. run tts first.");
  process.exit(1);
}

const pub = path.join(tmplDir, "public");
fs.mkdirSync(pub, { recursive: true });
fs.copyFileSync(voice, path.join(pub, "voice.mp3"));
fs.copyFileSync(captions, path.join(pub, "captions.json"));
if (fs.existsSync(meta)) fs.copyFileSync(meta, path.join(pub, "meta.json"));

const entry = path.join(tmplDir, "src/index.ts");
const outFile = path.join(outDir, "video.mp4");
const inputProps = {
  captionsSrc: "captions.json",
  audioSrc: "voice.mp3",
  metaSrc: "meta.json",
};

console.log("bundling...");
const serveUrl = await bundle({ entryPoint: entry, publicDir: pub });

console.log("selecting composition...");
const composition = await selectComposition({
  serveUrl,
  id: "IRVideo",
  inputProps,
});

console.log(`rendering ${composition.durationInFrames} frames (16:9)...`);
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: outFile,
  inputProps,
});

console.log(`done: ${outFile}`);
