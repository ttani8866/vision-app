import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { loadJapaneseFont } from "@/lib/ogFont";

export const runtime = "edge";

// パスポートの旅の記録OGP画像: 称号＋押印数＋総移動距離
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stamps = searchParams.get("stamps") ?? "0";
  const km = Number(searchParams.get("km") ?? 0);
  const title = (searchParams.get("title") ?? "旅人").slice(0, 12);

  const text = `アトラス・パスポート渡航印総移動距離あなたはこの旅で地球を移動しましたkm個${title}0123456789,.OwnersAtlas '`;
  const font = await loadJapaneseFont(text);

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
            flexDirection: "column",
            border: "3px solid #1E2A3A",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#1E2A3A" }}>
            Owner&apos;s Atlas Passport
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              color: "#1E2A3A",
              backgroundColor: "#F5D547",
              padding: "4px 32px",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", gap: 80, marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", fontSize: 26, color: "#1E2A3A" }}>渡航印</div>
              <div
                style={{
                  display: "flex",
                  fontSize: 88,
                  fontWeight: 700,
                  color: "#1E2A3A",
                }}
              >
                {stamps}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", fontSize: 26, color: "#1E2A3A" }}>
                総移動距離
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 88,
                  fontWeight: 700,
                  color: "#1E2A3A",
                }}
              >
                {km.toLocaleString()}km
              </div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#1E2A3A", opacity: 0.75 }}>
            あなたはこの旅で、地球を{km.toLocaleString()}km移動しました。
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font
        ? [{ name: "NotoSansJP", data: font, weight: 700 as const }]
        : undefined,
    }
  );
}
