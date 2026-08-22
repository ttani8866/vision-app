"use client";

import React from "react";
import { ShellCard } from "./primitives";
import {
  CeoBody,
  CxoGrid,
  GenBody,
  IrisBody,
  KanbeiBody,
  LegendBody,
  PipelineBody,
  PrismBody,
} from "./nodes";
import styles from "./dashboard.module.css";

/* 1184px未満で表示する縦積み。固定キャンバスのコネクタ線は座標が
   カード位置に紐づいていて縮小できないため、線が運んでいた情報を
   Flow の行として文字に落とし、関係の向きと両端を明示している。
   キャンバスにある情報はすべてこちらにも出る。 */

type FlowTone = "gold" | "muted" | "danger";

const TONE_LINE: Record<FlowTone, string> = {
  gold: "var(--gold-500)",
  muted: "var(--shell-text-faint)",
  danger: "var(--shell-danger)",
};

const TONE_TEXT: Record<FlowTone, string> = {
  gold: "var(--gold-500)",
  muted: "var(--shell-text-muted)",
  danger: "var(--shell-danger)",
};

function Flow({
  tone = "gold",
  from,
  to,
  dir = "to",
  label,
  note,
}: {
  tone?: FlowTone;
  from: string;
  to?: string;
  /** to=一方向 / both=双方向。キャンバスの矢印の向きと合わせる */
  dir?: "to" | "both";
  label: string;
  note?: string;
}) {
  const arrow = dir === "both" ? " ↔ " : " → ";
  return (
    <div style={{ display: "flex", gap: 12, padding: "6px 0 6px 20px" }}>
      <span
        aria-hidden
        style={{
          width: 1,
          alignSelf: "stretch",
          minHeight: 20,
          background: TONE_LINE[tone],
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: "var(--text-xs)", color: TONE_TEXT[tone], lineHeight: 1.6 }}>
          <span style={{ fontFamily: "var(--font-mono)" }}>{to ? from + arrow + to : from}</span>
          {"　"}
          {label}
        </div>
        {note && (
          <div style={{ fontSize: 10, color: "var(--shell-text-muted)", lineHeight: 1.6 }}>
            {note}
          </div>
        )}
      </div>
    </div>
  );
}

export interface OrgStackProps {
  onOpen: (id: string) => void;
  onSendDiscord: () => void;
  showGapLines: boolean;
  showLegend: boolean;
}

export function OrgStack({ onOpen, onSendDiscord, showGapLines, showLegend }: OrgStackProps) {
  return (
    <div className={styles.stackOnly}>
      <div
        className={styles.shellWidth}
        style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 4 }}
      >
        <ShellCard
          onClick={() => onOpen("ceo")}
          label="テツ の詳細を開く"
          border="2px solid var(--gold-500)"
          shadow="var(--shell-glow-gold)"
          style={{ padding: "14px 20px" }}
        >
          <CeoBody />
        </ShellCard>

        <Flow from="テツ" to="KANBEI" dir="both" label="経営判断・戦略" />

        <ShellCard
          tone="raised"
          onClick={() => onOpen("kanbei")}
          label="KANBEI の詳細を開く"
          border="1px solid var(--shell-border-strong)"
          shadow="var(--shell-shadow-card)"
          style={{ padding: "18px 22px" }}
        >
          <KanbeiBody />
        </ShellCard>

        <Flow from="テツ" to="IRIS" dir="both" label="日常・連絡" />
        <Flow
          from="IRIS"
          to="KANBEI"
          label="#iris-weekly"
          note="日曜22:00投稿 → 月曜8:00読み取り・A/B/Cジャッジ"
        />

        <ShellCard
          onClick={() => onOpen("iris")}
          label="IRIS の詳細を開く"
          border="1px solid var(--shell-info-strong)"
          style={{ padding: "16px 20px" }}
        >
          <IrisBody onSend={onSendDiscord} />
        </ShellCard>

        <Flow from="KANBEI" to="GEN" label="指示伝達（GEN召集）" />

        <ShellCard
          onClick={() => onOpen("gen")}
          label="GEN の詳細を開く"
          style={{ padding: "16px 18px" }}
        >
          <GenBody />
        </ShellCard>

        <div style={{ marginTop: 8 }}>
          <ShellCard radius="var(--radius-lg)" style={{ padding: "14px 16px" }}>
            <PipelineBody />
          </ShellCard>
        </div>

        <Flow tone="muted" from="KANBEI" to="CXO" label="CXO単独召集" />
        <Flow tone="muted" from="GEN" to="CXO" label="連絡・指示 → 統合してテツさんへ" />

        <div style={{ marginTop: 4 }}>
          <CxoGrid onOpen={onOpen} className={styles.cxoGridStack} />
        </div>

        {showGapLines && (
          <Flow
            tone="danger"
            from="Prism"
            label="SHINTOと未連携（Agent Gateway設計確定後）"
          />
        )}

        <ShellCard
          tone="sunken"
          onClick={() => onOpen("prism")}
          label="Prism の詳細を開く"
          style={{ padding: "16px 20px" }}
        >
          <PrismBody />
        </ShellCard>

        {showLegend && (
          <div style={{ marginTop: 8 }}>
            <ShellCard radius="var(--radius-lg)" style={{ padding: "14px 16px" }}>
              <LegendBody />
            </ShellCard>
          </div>
        )}
      </div>
    </div>
  );
}
