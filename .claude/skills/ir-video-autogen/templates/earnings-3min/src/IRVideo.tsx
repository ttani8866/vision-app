import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  delayRender,
  continueRender,
} from "remotion";
import { useEffect, useState } from "react";

type Sentence = { text: string; start: number; end: number };
type Captions = { text: string; sentences: Sentence[]; durationSec: number };
type Meta = {
  company?: string;
  ticker?: string;
  period?: string;
  title?: string;
  highlights?: { label: string; value: string; unit?: string }[];
  disclaimer?: string;
};

const FPS = 30;
const TITLE_SEC = 4.0;
const TAIL_SEC = 5.0; // disclaimer + outro

export const calcDurationFrames = (sec: number, fps: number) =>
  Math.ceil((TITLE_SEC + sec + TAIL_SEC) * fps);

const C = {
  navy: "#0B1D3A",
  navy2: "#123A6B",
  blue: "#1F6FEB",
  ice: "#CADCFC",
  gold: "#D4A857",
  white: "#FFFFFF",
  gray: "#9CA3AF",
};

export const IRVideo: React.FC<{
  captionsSrc: string;
  audioSrc: string;
  metaSrc: string;
}> = ({ captionsSrc, audioSrc, metaSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const [data, setData] = useState<Captions | null>(null);
  const [meta, setMeta] = useState<Meta>({});
  const [handle] = useState(() => delayRender("ir-data"));
  useEffect(() => {
    Promise.all([
      fetch(staticFile(captionsSrc)).then((r) => r.json()),
      fetch(staticFile(metaSrc))
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    ]).then(([c, m]) => {
      setData(c);
      setMeta(m);
      continueRender(handle);
    });
  }, [captionsSrc, metaSrc, handle]);

  if (!data) return <AbsoluteFill style={{ background: C.navy }} />;

  const narrationStart = TITLE_SEC;
  const narrationEnd = narrationStart + data.durationSec;
  const isTitle = t < narrationStart;
  const isTail = t > narrationEnd;
  const tNarration = t - narrationStart;

  const activeIdx = data.sentences.findIndex(
    (s) => tNarration >= s.start && tNarration < s.end,
  );

  return (
    <AbsoluteFill style={{ background: C.navy, fontFamily: "Yu Gothic, Meiryo, sans-serif" }}>
      <Audio src={staticFile(audioSrc)} startFrom={Math.round(narrationStart * fps)} />

      {/* Subtle background accent */}
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          background: "rgba(31,111,235,0.18)",
          filter: "blur(120px)",
          top: -400,
          right: -400,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: "rgba(212,168,87,0.10)",
          filter: "blur(120px)",
          bottom: -300,
          left: -200,
        }}
      />

      {/* Title slide */}
      {isTitle && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              opacity: interpolate(t, [0, 0.6, TITLE_SEC - 0.4, TITLE_SEC], [0, 1, 1, 0]),
              transform: `translateY(${interpolate(t, [0, 0.6], [20, 0], { extrapolateRight: "clamp" })}px)`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: C.gold,
                fontSize: 24,
                letterSpacing: 12,
                marginBottom: 24,
                fontWeight: 600,
              }}
            >
              INVESTOR RELATIONS
            </div>
            <div
              style={{
                color: C.white,
                fontSize: 92,
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: 18,
              }}
            >
              {meta.title || meta.company || "決算ハイライト"}
            </div>
            {meta.period && (
              <div style={{ color: C.ice, fontSize: 32, marginBottom: 18 }}>{meta.period}</div>
            )}
            {meta.ticker && (
              <div style={{ color: C.gray, fontSize: 22, letterSpacing: 4 }}>
                {meta.company} ({meta.ticker})
              </div>
            )}
          </div>
        </AbsoluteFill>
      )}

      {/* Body: narration view with optional KPI cards */}
      {!isTitle && !isTail && (
        <AbsoluteFill style={{ padding: 100 }}>
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: C.ice,
              fontSize: 22,
              letterSpacing: 4,
              marginBottom: 60,
            }}
          >
            <span>{meta.company || ""} {meta.ticker ? `(${meta.ticker})` : ""}</span>
            <span style={{ color: C.gold }}>{meta.period || ""}</span>
          </div>

          {/* KPI cards */}
          {meta.highlights && meta.highlights.length > 0 && (
            <div style={{ display: "flex", gap: 32, marginBottom: 80, flexWrap: "wrap" }}>
              {meta.highlights.slice(0, 3).map((h, i) => {
                const delay = i * 0.3;
                const opacity = interpolate(
                  tNarration,
                  [delay, delay + 0.6],
                  [0, 1],
                  { extrapolateRight: "clamp" },
                );
                const ty = interpolate(
                  tNarration,
                  [delay, delay + 0.6],
                  [16, 0],
                  { extrapolateRight: "clamp" },
                );
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      minWidth: 320,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(202,220,252,0.2)",
                      padding: 36,
                      borderRadius: 16,
                      opacity,
                      transform: `translateY(${ty}px)`,
                    }}
                  >
                    <div
                      style={{
                        color: C.gold,
                        fontSize: 18,
                        letterSpacing: 4,
                        marginBottom: 16,
                      }}
                    >
                      {h.label}
                    </div>
                    <div
                      style={{
                        color: C.white,
                        fontSize: 72,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      {h.value}
                      {h.unit && (
                        <span style={{ fontSize: 32, marginLeft: 8, color: C.ice }}>
                          {h.unit}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Caption (current sentence) */}
          <div
            style={{
              position: "absolute",
              bottom: 140,
              left: 100,
              right: 100,
              minHeight: 160,
            }}
          >
            <div
              style={{
                background: "rgba(11,29,58,0.85)",
                borderLeft: `4px solid ${C.gold}`,
                padding: "32px 40px",
                color: C.white,
                fontSize: 36,
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              {activeIdx >= 0 ? data.sentences[activeIdx].text.trim() : ""}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: 40,
              left: 100,
              right: 100,
              display: "flex",
              justifyContent: "space-between",
              color: C.gray,
              fontSize: 16,
            }}
          >
            <span>出典：開示資料</span>
            <span>
              {Math.max(0, Math.floor(tNarration))} / {Math.ceil(data.durationSec)}s
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* Tail: disclaimer */}
      {isTail && (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            padding: 200,
            textAlign: "center",
          }}
        >
          <div
            style={{
              opacity: interpolate(t - narrationEnd, [0, 0.8], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          >
            <div
              style={{
                color: C.gold,
                fontSize: 22,
                letterSpacing: 8,
                marginBottom: 36,
                fontWeight: 600,
              }}
            >
              DISCLAIMER
            </div>
            <div
              style={{
                color: C.white,
                fontSize: 32,
                lineHeight: 1.7,
                fontWeight: 400,
                maxWidth: 1400,
              }}
            >
              {meta.disclaimer ||
                "本動画は開示資料を要約したものであり、投資勧誘を目的とするものではありません。投資に関する最終判断はご自身の責任でお願いいたします。"}
            </div>
            <div
              style={{
                marginTop: 80,
                color: C.gray,
                fontSize: 18,
                letterSpacing: 4,
              }}
            >
              {meta.company || ""} {meta.ticker ? `({${meta.ticker}})` : ""}
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
