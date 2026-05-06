// ElevenLabs TTS with timestamps for IR narration.
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
// Default to Morioki (calm Japanese male, suitable for IR)
const voiceId = voiceArg || process.env.ELEMOTION_IR_VOICE_ID || "8EkOjt4xTPGMclNlh1pk";
const modelId = process.env.ELEMOTION_MODEL_ID || "eleven_multilingual_v2";
const text = fs.readFileSync(textFile, "utf8").trim();

const res = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
  {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability: 0.6, similarity_boost: 0.85, style: 0.15 },
    }),
  },
);
if (!res.ok) {
  console.error("ElevenLabs error:", res.status, await res.text());
  process.exit(1);
}
const json = await res.json();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "voice.mp3"), Buffer.from(json.audio_base64, "base64"));

const a = json.alignment || json.normalized_alignment;
const chars = a.characters;
const starts = a.character_start_times_seconds;
const ends = a.character_end_times_seconds;

// Sentence-level chunks (IR doesn't need karaoke; chapter timing is enough)
const sentences = [];
let buf = "";
let sStart = null;
const flush = (endIdx) => {
  if (buf.trim().length > 0 && sStart !== null) {
    sentences.push({ text: buf, start: sStart, end: ends[endIdx] });
  }
  buf = "";
  sStart = null;
};
for (let i = 0; i < chars.length; i++) {
  const c = chars[i];
  if (sStart === null && c !== " " && c !== "\n") sStart = starts[i];
  buf += c;
  if (c === "。" || c === "！" || c === "？" || c === "\n") {
    flush(i);
  }
}
flush(chars.length - 1);

fs.writeFileSync(
  path.join(outDir, "captions.json"),
  JSON.stringify({ text, sentences, durationSec: ends[ends.length - 1] }, null, 2),
);
console.log(`tts: ${sentences.length} sentences, ${ends[ends.length - 1].toFixed(2)}s`);
