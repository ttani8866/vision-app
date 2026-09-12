"use client";
import type { StoredEvaluation } from "@/lib/db";
import { Card, Eyebrow, Pill, fmtDate } from "./ui";

type Project = { name: string; latest: StoredEvaluation; versions: number };

export function groupProjects(history: StoredEvaluation[]): Project[] {
  const map = new Map<string, { latest: StoredEvaluation; versions: Set<string> }>();
  for (const h of history) {
    const cur = map.get(h.projectName);
    if (!cur) map.set(h.projectName, { latest: h, versions: new Set([h.versionName]) });
    else {
      cur.versions.add(h.versionName);
      if (h.createdAt > cur.latest.createdAt) cur.latest = h;
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, latest: v.latest, versions: v.versions.size }))
    .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
}

export default function ListView({ history, onOpen, onNew }: { history: StoredEvaluation[]; onOpen: (id: string) => void; onNew: () => void }) {
  const projects = groupProjects(history);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {projects.length === 0 ? (
        <Card>
          <div className="empty">
            まだ評価がありません。
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={onNew}>新しい企画書を採点</button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="project-grid">
          {projects.map((p) => {
            const ev = p.latest.evaluation;
            return (
              <Card key={p.name} pad={false} className="project-card" onClick={() => onOpen(p.latest.evaluationId)}>
                <div className="head">
                  <div className="name">{p.name}</div>
                  {ev.hasHold ? (
                    <Pill tone="warn">採点保留</Pill>
                  ) : (
                    <span className="score">
                      {ev.totalScore}
                      <small> /{ev.totalPoints}</small>
                    </span>
                  )}
                </div>
                <div className="meta">
                  <span className="mono">{p.latest.versionName}</span>
                  <span>·</span>
                  <span>{p.versions}版</span>
                  <span>·</span>
                  <span>AI参考評価</span>
                  {ev.provider === "mock" && (
                    <>
                      <span>·</span>
                      <span style={{ color: "var(--status-mock-fg)" }}>モック</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="mono">{fmtDate(p.latest.createdAt)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card pad={false}>
        <div style={{ padding: "16px 20px 10px" }}>
          <Eyebrow>評価履歴</Eyebrow>
        </div>
        {history.length === 0 ? (
          <div className="empty">履歴はまだありません</div>
        ) : (
          <div className="table-wrap">
            <div className="table-head">
              <span>企画名</span>
              <span>版</span>
              <span>評価種別</span>
              <span style={{ textAlign: "right" }}>総合点</span>
              <span>日時</span>
              <span>基準セット</span>
            </div>
            {history.map((h) => {
              const ev = h.evaluation;
              return (
                <div key={h.evaluationId} className="table-row" onClick={() => onOpen(h.evaluationId)}>
                  <span className="ellipsis" style={{ color: "var(--text-strong)", fontWeight: 500 }}>{h.projectName}</span>
                  <span className="mono">{h.versionName}</span>
                  <span>
                    <Pill tone={ev.provider === "mock" ? "mock" : "info"} dot={false}>
                      AI参考評価{ev.provider === "mock" ? "（モック）" : ""}
                    </Pill>
                  </span>
                  <span className="mono" style={{ fontWeight: 700, textAlign: "right", color: "var(--text-strong)" }}>
                    {ev.hasHold ? <span style={{ color: "var(--status-warn-fg)", fontWeight: 500 }}>保留</span> : ev.totalScore}
                  </span>
                  <span className="mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>{fmtDate(h.createdAt)}</span>
                  <span className="mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>
                    {ev.criteriaSetId} v{ev.criteriaVersion}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ padding: "10px 20px 14px", fontSize: 10, color: "var(--text-subtle)", lineHeight: 1.6 }}>
          評価は追記型で保存され、AI参考評価は変更できません。保存済み結果の閲覧に費用は発生しません。
        </div>
      </Card>
    </div>
  );
}
