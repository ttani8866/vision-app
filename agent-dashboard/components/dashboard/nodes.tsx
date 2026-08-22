"use client";

import React from "react";
import { AGENTS, CXO_AREAS, CXO_IDS, CXO_POSTS } from "@/data/agents";
import { PRISM_SKILL_COUNT } from "@/data/prism";
import { Button } from "@/components/ds/Button";
import { StatusDot } from "@/components/ds/StatusDot";
import { StatusPill } from "@/components/ds/StatusPill";
import { Chip, Eyebrow } from "./primitives";

type Open = (id: string) => void;

const desc: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--shell-text-muted)",
  lineHeight: 1.7,
};
const footnote: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--shell-text-faint)",
};
const nameRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};
const sub: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  fontWeight: "var(--weight-medium)",
  color: "var(--shell-text-muted)",
  marginLeft: 4,
};

export function CeoBody() {
  return (
    <>
      <div style={nameRow}>
        <div style={{ fontSize: 15, fontWeight: "var(--weight-bold)", color: "var(--shell-text-strong)" }}>
          {AGENTS.ceo.name}
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-bold)",
              color: "var(--gold-500)",
              letterSpacing: "var(--tracking-caps)",
              marginLeft: 6,
            }}
          >
            CEO
          </span>
        </div>
        <div style={{ fontSize: 10, color: "var(--shell-text-subtle)" }}>レイヤー1</div>
      </div>
      <div style={{ ...desc, marginTop: 6, lineHeight: 1.6 }}>{AGENTS.ceo.role}</div>
      <div style={{ ...footnote, marginTop: 2 }}>GENとの直接連絡：可能だが例外的</div>
    </>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="var(--gold-500)"
      />
    </svg>
  );
}

export function KanbeiBody() {
  return (
    <>
      <div style={nameRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StarIcon />
          <div style={{ fontSize: 16, fontWeight: "var(--weight-bold)", color: "var(--shell-text-strong)" }}>
            KANBEI<span style={sub}>参謀 · 会長室長 · レイヤー2</span>
          </div>
        </div>
        <StatusPill status="auto" onShell tone="strong" />
      </div>
      <div style={{ ...desc, marginTop: 10 }}>
        論点整理・振り分け判断 · GENへの指示伝達 · CXO単独召集の判断 · VisionX読み取り ·
        週次ブリーフィング生成 · 議事録パイプライン · 意思決定ログ管理
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Chip tone="gold">毎週月曜8:00自動実行</Chip>
        <Chip>#action-log 引き継ぎ</Chip>
        <Chip>未対応アクション冒頭再掲</Chip>
      </div>
    </>
  );
}

export function IrisBody({ onSend }: { onSend: () => void }) {
  return (
    <>
      <div style={nameRow}>
        <div style={{ fontSize: 14, fontWeight: "var(--weight-bold)", color: "var(--shell-text-strong)" }}>
          IRIS<span style={sub}>COS · 広報秘書 · レイヤー3（独立系）</span>
        </div>
        <StatusPill status="async" onShell />
      </div>
      <div style={{ ...desc, marginTop: 8 }}>
        対外広報 · メール · Moltbook · Discord報告 · テツさんの日常業務・連絡系窓口
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Chip tone="info">日曜22:00 #iris-weekly 投稿</Chip>
        <Chip>緊急は随時 · #general 通知</Chip>
      </div>
      <div style={{ ...footnote, marginTop: 8 }}>
        OpenClaw / Discord独立稼働 · Claude Codeとは別系統
      </div>
      <Button
        variant="info"
        onShell
        fullWidth
        style={{ marginTop: 10 }}
        onClick={(e) => {
          e.stopPropagation();
          onSend();
        }}
      >
        Discordで指示を送る
      </Button>
    </>
  );
}

export function GenBody() {
  return (
    <>
      <div style={nameRow}>
        <div style={{ fontSize: 14, fontWeight: "var(--weight-bold)", color: "var(--shell-text-strong)" }}>
          GEN<span style={sub}>COO · 執行統括 · レイヤー4</span>
        </div>
        <StatusPill status="manual" onShell />
      </div>
      <div style={{ ...desc, marginTop: 8 }}>
        各CXOへ連絡・指示 · アウトプット統合してテツさんへ提示 · 複数CXOをまたぐ案件の実行管理
      </div>
      <div style={{ ...footnote, marginTop: 4 }}>召集：KANBEIから</div>
    </>
  );
}

const PIPELINE_ROWS: Array<[string, string]> = [
  ["経営数字", "→ RIN（CFO）※なべさんと実装相談"],
  ["議事録", "→ KANBEI"],
  ["#iris-weekly", "（対外情報）→ KANBEI"],
  ["#action-log", "（未対応アクション）→ KANBEI"],
];

export function PipelineBody() {
  return (
    <>
      <Eyebrow>パイプライン読み取り担当</Eyebrow>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          marginTop: 8,
          fontSize: "var(--text-xs)",
          color: "var(--shell-text-muted)",
        }}
      >
        {PIPELINE_ROWS.map(([term, rest]) => (
          <div key={term}>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--shell-text-body)" }}>
              {term}
            </span>{" "}
            {rest}
          </div>
        ))}
      </div>
    </>
  );
}

export function CxoCard({ id, onOpen }: { id: string; onOpen: Open }) {
  const a = AGENTS[id];
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={a.name + " の詳細を開く"}
      onClick={() => onOpen(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(id);
        }
      }}
      style={{
        background: "var(--shell-surface)",
        border: "1px solid var(--shell-border)",
        borderRadius: "var(--radius-lg)",
        padding: 12,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "var(--text-base)",
            fontWeight: "var(--weight-bold)",
            color: "var(--shell-text-strong)",
          }}
        >
          {a.name}
        </span>
        <StatusDot status={a.status} />
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: "var(--weight-bold)",
          color: "var(--gold-500)",
          letterSpacing: ".06em",
          marginTop: 2,
        }}
      >
        {CXO_POSTS[id]}
      </div>
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--shell-text-muted)",
          marginTop: 6,
          lineHeight: 1.5,
        }}
      >
        {CXO_AREAS[id]}
      </div>
    </div>
  );
}

export function CxoGrid({ onOpen, className }: { onOpen: Open; className?: string }) {
  return (
    <>
      <Eyebrow style={{ marginBottom: 8 }}>レイヤー5 · 専門CXO 7体（GEN統括）</Eyebrow>
      <div className={className}>
        {CXO_IDS.map((id) => (
          <CxoCard key={id} id={id} onOpen={onOpen} />
        ))}
      </div>
    </>
  );
}

export function PrismBody() {
  return (
    <>
      <div style={{ ...nameRow, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Eyebrow>KPR専用 · レイヤー6</Eyebrow>
          <div
            style={{
              fontSize: 14,
              fontWeight: "var(--weight-bold)",
              color: "var(--shell-text-strong)",
            }}
          >
            Prism
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-regular)",
                color: "var(--shell-text-muted)",
                marginLeft: 4,
              }}
            >
              コマンド1 · スキル{PRISM_SKILL_COUNT}
            </span>
          </div>
        </div>
        <StatusPill status="manual" label="手動" onShell />
      </div>
      <div style={{ ...desc, marginTop: 10, lineHeight: 1.6 }}>
        PR戦略 · メディアリレーション · KPR-AgentOS
      </div>
      <div style={{ ...footnote, marginTop: 4 }}>
        SHINTOと二系統並行 · 統合ビューなし（Agent Gateway設計確定後に対応）
      </div>
    </>
  );
}

export function LegendBody() {
  return (
    <>
      <Eyebrow style={{ marginBottom: 8 }}>ステータス凡例</Eyebrow>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 16px",
          fontSize: "var(--text-xs)",
        }}
      >
        <StatusPill status="auto" onShell size="sm" tone="muted" />
        <StatusPill status="manual" onShell size="sm" tone="muted" />
        <StatusPill status="async" onShell size="sm" tone="muted" />
        <StatusPill status="idle" onShell size="sm" tone="muted" />
      </div>
    </>
  );
}
