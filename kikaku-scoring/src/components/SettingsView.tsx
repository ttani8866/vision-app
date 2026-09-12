"use client";
import type { CriteriaSet, ServerConfig } from "@/lib/types";
import { Card, Eyebrow } from "./ui";

export default function SettingsView({ sets, config }: { sets: CriteriaSet[]; config: ServerConfig | null }) {
  const usage = config?.usage;
  const pct = usage && usage.limitUsd ? Math.min(100, Math.round((usage.totalCostUsd / usage.limitUsd) * 100)) : 0;
  return (
    <div className="settings-grid">
      <div className="col">
        {sets.map((s) => (
          <Card key={`${s.setId}|${s.version}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <Eyebrow>基準セット</Eyebrow>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.setId} v{s.version}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>
                {s.name} · {s.items.length}項目 · {s.totalPoints}点
              </div>
              <div>
                {s.items.map((it) => (
                  <div key={it.itemId} className="hairline-row" style={{ alignItems: "flex-start", padding: "8px 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 700, color: "var(--text-strong)" }}>{it.name}</span>
                      {it.criteria.map((c, i) => (
                        <span key={i} style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>○ {c}</span>
                      ))}
                    </div>
                    <span className="mono" style={{ fontWeight: 700, color: "var(--text-strong)", flex: "none" }}>{it.maxPoints}点</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-subtle)", lineHeight: 1.6 }}>
                配点は基準セットで固定。採点記録には基準セットIDとバージョンを保存します。基準の更新は新バージョンとして登録され、過去の記録は旧バージョンに紐づいたまま保持されます。
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="col">
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Eyebrow>AI接続</Eyebrow>
            <div className="hairline-row"><span>接続方式</span><span style={{ color: "var(--text-strong)" }}>サーバー経由（キーは非公開）</span></div>
            <div className="hairline-row"><span>プロバイダ</span><span className="mono" style={{ color: "var(--text-strong)" }}>{config?.provider ?? "取得中"}</span></div>
            <div className="hairline-row"><span>採用モデル</span><span className="mono" style={{ color: "var(--text-strong)" }}>{config?.modelId ?? "取得中"}</span></div>
            <div className="hairline-row"><span>画像の解像度</span><span className="mono" style={{ color: "var(--text-strong)" }}>{config?.imageDetail ?? "取得中"}</span></div>
            <div className="hairline-row"><span>応答の保存</span><span style={{ color: "var(--text-strong)" }}>無効（store=false で送信）</span></div>
            <div className="hairline-row"><span>OCR</span><span style={{ color: "var(--text-strong)" }}>{config ? (config.ocrEnabled ? "有効（文字レイヤーのないページのみ）" : "無効") : "取得中"}</span></div>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", lineHeight: 1.6 }}>採用モデルと単価は検証後に確定します。提供元アカウントのデータ保持設定は未確認です。</div>
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Eyebrow>利用上限</Eyebrow>
              <span className="mono" style={{ fontSize: 12, color: "var(--text-body)" }}>
                {usage ? `$${usage.totalCostUsd.toFixed(2)} / ${usage.limitUsd === null ? "上限なし" : `$${usage.limitUsd.toFixed(2)}`}` : "取得中"}
              </span>
            </div>
            <div className="progress"><div style={{ width: `${pct}%` }} /></div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              採点{usage?.totalRuns ?? 0}回 · 上限到達時は採点を停止して通知します。保存済み結果の閲覧に費用は発生しません。上限は環境変数 USAGE_LIMIT_USD で管理者が設定します。
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Eyebrow>段階2以降</Eyebrow>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
              版間比較・最大4件比較、PNG出力、表形式コピー、バックアップ・復元、人による修正評価は段階2で実装します。Word・PowerPoint の変換対応は段階3です。
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
