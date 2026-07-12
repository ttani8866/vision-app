import { ImageResponse } from "next/og";
import { CATEGORIES, SCORE_AXES } from "@/lib/categories";
import { getCase } from "@/lib/content";
import { loadJapaneseFont } from "@/lib/ogFont";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: { slug: string };
}) {
  const item = getCase(params.slug);
  if (!item) return new ImageResponse(<div>Not Found</div>, size);

  const cat = CATEGORIES[item.category];
  const text = `${item.name}${item.region}${cat.label}オーナー制度の証明書起源物語所有の証時間の物語語りの場OwnersAtlas.Vol${item.vol}0123456789 '`;
  const font = await loadJapaneseFont(text);

  // レーダーチャートのポリゴン（中心 110,110、半径 90、上から時計回り）
  const cx = 110;
  const cy = 110;
  const r = 90;
  const angles = [-90, 0, 90, 180];
  const point = (deg: number, ratio: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${cx + Math.cos(rad) * r * ratio},${cy + Math.sin(rad) * r * ratio}`;
  };
  const values = SCORE_AXES.map((a) => item.scores[a.key] / 3);
  const polygon = angles.map((deg, i) => point(deg, values[i])).join(" ");
  const frame = angles.map((deg) => point(deg, 1)).join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#FAF6EF",
          padding: 40,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            border: "3px solid #1E2A3A",
            padding: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "row",
              border: "1.5px solid #1E2A3A",
              padding: 48,
              alignItems: "center",
              gap: 48,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  color: "#1E2A3A",
                  letterSpacing: 4,
                }}
              >
                Owner&apos;s Atlas Vol.{item.vol}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 30,
                  color: cat.color,
                  fontWeight: 700,
                }}
              >
                {cat.label} / {item.region}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 58,
                  color: "#1E2A3A",
                  fontWeight: 700,
                  lineHeight: 1.25,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 12,
                  fontSize: 24,
                  color: "#1E2A3A",
                  borderTop: "2px dashed rgba(30,42,58,0.5)",
                  paddingTop: 16,
                }}
              >
                オーナー制度の証明書
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width={220} height={220} viewBox="0 0 220 220">
                <polygon
                  points={frame}
                  fill="none"
                  stroke="#1E2A3A"
                  strokeWidth={2}
                  opacity={0.4}
                />
                <polygon
                  points={angles.map((deg) => point(deg, 2 / 3)).join(" ")}
                  fill="none"
                  stroke="#1E2A3A"
                  strokeWidth={1}
                  opacity={0.25}
                />
                <polygon
                  points={angles.map((deg) => point(deg, 1 / 3)).join(" ")}
                  fill="none"
                  stroke="#1E2A3A"
                  strokeWidth={1}
                  opacity={0.25}
                />
                <polygon
                  points={polygon}
                  fill={cat.color}
                  fillOpacity={0.5}
                  stroke={cat.color}
                  strokeWidth={3}
                />
              </svg>
              <div style={{ display: "flex", fontSize: 18, color: "#1E2A3A" }}>
                起源物語・所有の証・時間の物語・語りの場
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "NotoSansJP", data: font, weight: 700 as const }]
        : undefined,
    }
  );
}
