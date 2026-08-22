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

/* 1184px以上で表示する固定キャンバス。原設計の 1120×960 と各ノードの
   絶対座標をそのまま再現している。コネクタ線は端点がカード位置に紐づいて
   いるため、ここではカードの left / top / width / height を一切変えない。 */

const CANVAS_W = 1120;
const CANVAS_H = 960;

const GOLD = "var(--gold-500)";
const MUTED_LINE = "var(--shell-text-faint)";
const LABEL_MUTED = "var(--shell-text-muted)";
const DANGER = "var(--shell-danger)";

const sans = { fontFamily: "var(--font-sans)", fontSize: 11 } as const;
const mono = { fontFamily: "var(--font-mono)", fontSize: 11 } as const;

function Markers() {
  return (
    <defs>
      <marker id="oc-gold-end" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" style={{ fill: GOLD }} />
      </marker>
      <marker id="oc-gold-start" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
        <path d="M8,0 L0,4 L8,8 Z" style={{ fill: GOLD }} />
      </marker>
      <marker id="oc-muted-end" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" style={{ fill: MUTED_LINE }} />
      </marker>
    </defs>
  );
}

function Connectors() {
  return (
    <svg
      width={CANVAS_W}
      height={CANVAS_H}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden
    >
      <Markers />

      {/* CEO ↔ KANBEI */}
      <line
        x1="420" y1="112" x2="380" y2="170"
        style={{ stroke: GOLD }} strokeWidth="1.5"
        markerStart="url(#oc-gold-start)" markerEnd="url(#oc-gold-end)"
      />
      <text x="300" y="148" style={{ ...sans, fill: GOLD }}>経営判断・戦略</text>

      {/* CEO ↔ IRIS */}
      <line
        x1="640" y1="112" x2="820" y2="170"
        style={{ stroke: GOLD }} strokeWidth="1.5"
        markerStart="url(#oc-gold-start)" markerEnd="url(#oc-gold-end)"
      />
      <text x="740" y="132" style={{ ...sans, fill: GOLD }}>日常・連絡</text>

      {/* IRIS → KANBEI（#iris-weekly 経由の非同期） */}
      <path
        d="M760,410 C740,470 660,470 604,420"
        fill="none" style={{ stroke: GOLD }} strokeWidth="1.5"
        markerEnd="url(#oc-gold-end)"
      />
      <text x="618" y="472" style={{ ...mono, fill: GOLD }}>#iris-weekly</text>
      <text x="618" y="486" style={{ fontFamily: "var(--font-sans)", fontSize: 10, fill: LABEL_MUTED }}>
        日曜22:00投稿 → 月曜8:00読み取り・A/B/Cジャッジ
      </text>

      {/* KANBEI → GEN */}
      <line
        x1="360" y1="410" x2="440" y2="500"
        style={{ stroke: GOLD }} strokeWidth="1.5"
        markerEnd="url(#oc-gold-end)"
      />
      <text x="290" y="462" style={{ ...sans, fill: GOLD }}>指示伝達（GEN召集）</text>

      {/* KANBEI → CXO（単独召集） */}
      <path
        d="M180,410 C140,540 140,600 240,660"
        fill="none" style={{ stroke: MUTED_LINE }} strokeWidth="1.5" strokeDasharray="5 4"
        markerEnd="url(#oc-muted-end)"
      />
      <text x="80" y="560" style={{ ...sans, fill: LABEL_MUTED }}>CXO単独召集</text>

      {/* GEN → CXO */}
      <line
        x1="490" y1="630" x2="490" y2="660"
        style={{ stroke: MUTED_LINE }} strokeWidth="1.5"
        markerEnd="url(#oc-muted-end)"
      />
      <text x="504" y="652" style={{ ...sans, fill: LABEL_MUTED }}>
        連絡・指示 → 統合してテツさんへ
      </text>
    </svg>
  );
}

function GapLines() {
  return (
    <svg
      width={CANVAS_W}
      height={CANVAS_H}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden
    >
      <defs>
        <marker id="oc-danger-end" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" style={{ fill: DANGER }} />
        </marker>
      </defs>
      <line
        x1="400" y1="815" x2="400" y2="792"
        style={{ stroke: DANGER }} strokeWidth="1.5" strokeDasharray="5 4"
        markerEnd="url(#oc-danger-end)"
      />
      <text x="412" y="808" style={{ ...sans, fill: DANGER }}>
        SHINTOと未連携（Agent Gateway設計確定後）
      </text>
    </svg>
  );
}

export interface OrgCanvasProps {
  onOpen: (id: string) => void;
  onSendDiscord: () => void;
  showGapLines: boolean;
  showLegend: boolean;
}

export function OrgCanvas({ onOpen, onSendDiscord, showGapLines, showLegend }: OrgCanvasProps) {
  return (
    <div className={styles.canvasOnly} style={{ overflowX: "auto" }}>
      <div
        style={{
          position: "relative",
          width: CANVAS_W,
          height: CANVAS_H,
          margin: "24px auto 0",
        }}
      >
        <Connectors />
        {showGapLines && <GapLines />}

        <ShellCard
          onClick={() => onOpen("ceo")}
          label="テツ の詳細を開く"
          border={`2px solid ${GOLD}`}
          shadow="var(--shell-glow-gold)"
          style={{ position: "absolute", left: 300, top: 12, width: 440, height: 100, padding: "14px 20px" }}
        >
          <CeoBody />
        </ShellCard>

        <ShellCard
          tone="raised"
          onClick={() => onOpen("kanbei")}
          label="KANBEI の詳細を開く"
          border="1px solid var(--shell-border-strong)"
          shadow="var(--shell-shadow-card)"
          style={{ position: "absolute", left: 110, top: 170, width: 500, height: 240, padding: "18px 22px" }}
        >
          <KanbeiBody />
        </ShellCard>

        <ShellCard
          onClick={() => onOpen("iris")}
          label="IRIS の詳細を開く"
          border="1px solid var(--shell-info-strong)"
          style={{ position: "absolute", left: 700, top: 170, width: 360, height: 240, padding: "16px 20px" }}
        >
          <IrisBody onSend={onSendDiscord} />
        </ShellCard>

        <ShellCard
          onClick={() => onOpen("gen")}
          label="GEN の詳細を開く"
          style={{ position: "absolute", left: 300, top: 500, width: 380, height: 130, padding: "16px 18px" }}
        >
          <GenBody />
        </ShellCard>

        <ShellCard
          radius="var(--radius-lg)"
          style={{ position: "absolute", left: 700, top: 500, width: 360, height: 130, padding: "14px 16px" }}
        >
          <PipelineBody />
        </ShellCard>

        <div style={{ position: "absolute", left: 8, top: 662, width: 1104 }}>
          <CxoGrid onOpen={onOpen} className={styles.cxoGridCanvas} />
        </div>

        <ShellCard
          tone="sunken"
          onClick={() => onOpen("prism")}
          label="Prism の詳細を開く"
          style={{ position: "absolute", left: 60, top: 815, width: 640, height: 120, padding: "16px 20px" }}
        >
          <PrismBody />
        </ShellCard>

        {showLegend && (
          <ShellCard
            radius="var(--radius-lg)"
            style={{ position: "absolute", left: 750, top: 815, width: 350, padding: "14px 16px" }}
          >
            <LegendBody />
          </ShellCard>
        )}
      </div>
    </div>
  );
}
