// ElevenLabs TTS with word-level timestamps.
// Usage: node scripts/tts.mjs <text-file> <out-dir> [voice_id]
import fs from "node:fs";
import path from "node:path";

const [, , textFile, outDir, voiceArg] = process.argv;
if (!textFile || !outDir) {
  console.error("usage: tts.mjs <text-file> <out-dir> [voice_id]");
  process.exit(1);
}
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY missing");
  process.exit(1);
}
const voiceId = voiceArg || process.env.ELEMOTION_VOICE_ID || "XB0fDUnXU5powFXDhCwa";
const modelId = process.env.ELEMOTION_MODEL_ID || "eleven_multilingual_v2";
const text = fs.readFileSync(textFile, "utf8").trim();

const res = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
  {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: modelId }),
  },
);
if (!res.ok) {
  console.error("ElevenLabs error:", res.status, await res.text());
  process.exit(1);
}
const json = await res.json();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "voice.mp3"), Buffer.from(json.audio_base64, "base64"));

// Group character alignment into words by whitespace / Japanese boundary
const a = json.alignment || json.normalized_alignment;
const chars = a.characters;
const starts = a.character_start_times_seconds;
const ends = a.character_end_times_seconds;
const words = [];
let buf = "";
let wStart = null;
const flush = (endIdx) => {
  if (buf.length > 0 && wStart !== null) {
    words.push({ text: buf, start: wStart, end: ends[endIdx] });
  }
  buf = "";
  wStart = null;
};
for (let i = 0; i < chars.length; i++) {
  const c = chars[i];
  if (c === " " || c === "\n" || c === "　" || c === "、" || c === "。") {
    flush(i - 1 >= 0 ? i - 1 : i);
    continue;
  }
  if (wStart === null) wStart = starts[i];
  buf += c;
}
flush(chars.length - 1);

fs.writeFileSync(
  path.join(outDir, "captions.json"),
  JSON.stringify({ text, words, durationSec: ends[ends.length - 1] }, null, 2),
);
console.log(`tts: ${words.length} words, ${ends[ends.length - 1].toFixed(2)}s`);
