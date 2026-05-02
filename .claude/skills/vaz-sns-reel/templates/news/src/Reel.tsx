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

type Word = { text: string; start: number; end: number };
type Captions = { text: string; words: Word[]; durationSec: number };

export const calcDurationFrames = (sec: number, fps: number) =>
  Math.ceil((sec + 1.5) * fps); // +1.5s tail for CTA

export const Reel: React.FC<{ captionsSrc: string; audioSrc: string }> = ({
  captionsSrc,
  audioSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const [data, setData] = useState<Captions | null>(null);
  const [handle] = useState(() => delayRender("captions"));
  useEffect(() => {
    fetch(staticFile(captionsSrc))
      .then((r) => r.json())
      .then((d: Captions) => {
        setData(d);
        continueRender(handle);
      });
  }, [captionsSrc, handle]);

  if (!data) return <AbsoluteFill style={{ background: "#0B1D3A" }} />;

  const total = data.durationSec;
  const isHook = t < 1.0;
  const isCTA = t > total + 0.2;

  // Active word index (karaoke)
  const activeIdx = data.words.findIndex((w) => t >= w.start && t < w.end);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0B1D3A 0%, #1F6FEB 100%)",
        fontFamily: "Yu Gothic, Meiryo, sans-serif",
      }}
    >
      <Audio src={staticFile(audioSrc)} />

      {/* Animated bg accent */}
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            width: 900,
            height: 900,
            borderRadius: "50%",
            background: "rgba(242,166,90,0.22)",
            filter: "blur(60px)",
            top: 200 + Math.sin(t * 0.6) * 80,
            left: -200 + Math.cos(t * 0.4) * 80,
          }}
        />
      </AbsoluteFill>

      {/* Top brand bar */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 60,
          right: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#CADCFC",
          fontSize: 28,
          letterSpacing: 6,
          fontWeight: 700,
        }}
      >
        <span>SHINTO × VAZ</span>
        <span style={{ color: "#F2A65A" }}>● LIVE</span>
      </div>

      {/* Hook flash */}
      {isHook && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              transform: `scale(${interpolate(t, [0, 0.3, 1.0], [0.6, 1.1, 1.0])})`,
              opacity: interpolate(t, [0, 0.2, 0.9, 1.0], [0, 1, 1, 0]),
              background: "#F2A65A",
              color: "#0B1D3A",
              padding: "30px 80px",
              fontSize: 110,
              fontWeight: 900,
              letterSpacing: 6,
              boxShadow: "0 16px 60px rgba(0,0,0,0.4)",
            }}
          >
            速報
          </div>
        </AbsoluteFill>
      )}

      {/* Karaoke captions */}
      {!isHook && !isCTA && (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 480,
            paddingLeft: 60,
            paddingRight: 60,
          }}
        >
          <div
            style={{
              maxWidth: 960,
              textAlign: "center",
              lineHeight: 1.45,
              fontSize: 64,
              fontWeight: 800,
              color: "white",
              textShadow: "0 6px 20px rgba(0,0,0,0.6)",
            }}
          >
            {data.words.map((w, i) => {
              const active = i === activeIdx;
              const past = activeIdx >= 0 && i < activeIdx;
              return (
                <span
                  key={i}
                  style={{
                    color: active ? "#F2A65A" : past ? "#CADCFC" : "white",
                    background: active ? "rgba(242,166,90,0.18)" : "transparent",
                    padding: active ? "0 12px" : "0 6px",
                    borderRadius: 8,
                    transition: "color 0.1s",
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* CTA */}
      {isCTA && (
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
        >
          <div
            style={{
              color: "#F2A65A",
              fontSize: 36,
              letterSpacing: 8,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            FOLLOW FOR MORE
          </div>
          <div style={{ color: "white", fontSize: 96, fontWeight: 900 }}>続きはプロフから</div>
        </AbsoluteFill>
      )}

      {/* Bottom progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 12,
          width: `${Math.min(100, (t / (total + 1.5)) * 100)}%`,
          background: "#F2A65A",
        }}
      />
    </AbsoluteFill>
  );
};
