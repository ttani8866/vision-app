"use client";

import React from "react";
import {
  PRISM_COMMAND,
  PRISM_PLANNING,
  PRISM_PRACTICE,
  PRISM_SKILL_COUNT,
  PRISM_VERSION,
} from "@/data/prism";
import type { PrismSkill } from "@/lib/types";
import { StatusDot } from "@/components/ds/StatusDot";
import { Eyebrow } from "./primitives";
import styles from "./dashboard.module.css";

/* 原設計は「7エージェント構成 PRISM-01〜07」だったが、実体は Claude Code
   プラグイン kpr-prism（コマンド1本 + PRWorks 13スキル）だったため、
   リポジトリの構成に合わせて企画3 / 実務展開10のグルーピングに置き換えた。 */

function SkillCard({ skill }: { skill: PrismSkill }) {
  return (
    <div
      style={{
        background: "var(--shell-surface)",
        border: "1px solid var(--shell-border)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-bold)",
            color: "var(--shell-text-strong)",
            overflowWrap: "anywhere",
          }}
        >
          {skill.id}
        </span>
        <StatusDot status="manual" />
      </div>
      <div style={{ fontSize: "var(--text-sm)", color: "var(--shell-text-muted)", marginTop: 8 }}>
        {skill.label}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20 }}>
      <Eyebrow style={{ marginBottom: 8 }}>{title}</Eyebrow>
      <div className={styles.prismGrid}>{children}</div>
    </div>
  );
}

export function PrismTab() {
  return (
    <div className={styles.shellWidth} style={{ marginTop: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Eyebrow>KPR-PRISM · コマンド1 · スキル{PRISM_SKILL_COUNT}</Eyebrow>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--shell-warning)" }}>
          統合ビューはAgent Gateway設計確定後に対応
        </div>
      </div>

      <Section title="コマンド">
        <SkillCard skill={PRISM_COMMAND} />
      </Section>

      <Section title="PRWorks 企画3スキル · 分析 → 作成 → 検証">
        {PRISM_PLANNING.map((s) => (
          <SkillCard key={s.id} skill={s} />
        ))}
      </Section>

      <Section title="PRWorks 実務展開10スキル · 報告書は分析 → 作成の2段構え">
        {PRISM_PRACTICE.map((s) => (
          <SkillCard key={s.id} skill={s} />
        ))}
      </Section>

      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--shell-text-faint)",
          marginTop: 20,
          lineHeight: 1.7,
        }}
      >
        役割：PR戦略 · メディアリレーション · KPR-AgentOS ｜ トリガー：手動
        <br />
        出典：kpr-prism プラグイン {PRISM_VERSION}（takahiro-kpr/kpr-prism）
      </div>
    </div>
  );
}
