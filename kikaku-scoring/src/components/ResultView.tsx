"use client";
import { useState } from "react";
import type { StoredEvaluation, StoredPage } from "@/lib/db";
import type { ItemResult } from "@/lib/types";
import PageViewer from "./PageViewer";
import Radar from "./Radar";
import { Card, Eyebrow, Pill, fmtDate, type PillTone } from "./ui";

const JUDGEMENT_LABEL: Record<ItemResult["judgement"], string> = {
  confirmed: "根拠を確認できた",
  insufficient: "全体を読めたが説明不足",
  unreadable: "文字や図が読めず判断できない",
};
const EVIDENCE_LABEL: Record<ItemResult["evidenceStatus"], { text: string; tone: PillTone }> = {
  recorded: { text: "記載あり", tone: "ok" },
  insufficient: { text: "記載不足", tone: "warn" },
  unreadable: { text: "読み取り不可", tone: "err" },
};
const TEXT_STATUS_LABEL = { text: "文字あり", ocr: "OCR", image_only: "画像のみ" } as const;
const SHORT: Record<string, string> = { 愛着度: "愛着", 表現力: "表現", "着眼点・発想力": "着眼", "現状把握・論理性": "論理", "共感性・拡散力": "共感", 効果: "効果" };

export default function ResultView({
  record,
  siblings,
  onOpen,
}: {
  record: StoredEvaluation;
  siblings: StoredEvaluation[]; // 同じ企画の評価履歴（新しい順）
  onOpen: (id: string) => void;
}) {
  const ev = record.evaluation;
  const [viewer, setViewer] = useState<StoredPage | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pageById = new Map(record.pages.map((p) => [p.pageId, p]));
  const itemName = (id: string) => ev.items.find((i) => i.itemId === id)?.name ?? id;
  const openPage = (pageId: string) => {
    const p = pageById.get(pageId);
    if (p) setViewer(p);
  };
  const heldItems = ev.items.filter((i) => i.held);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {viewer && <PageViewer page={viewer} onClose={() => setViewer(null)} />}

      <div className="result-head">
        <div style={{ minWidth: 0 }}>
          <div className="name">{record.projectName}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span>AI参考評価</span>
            <span>·</span>
            <span className="mono">{ev.criteriaSetId} v{ev.criteriaVersion}</span>
            <span>·</span>
            <span className="mono">{ev.modelId}</span>
            <span>·</span>
            <span className="mono">{fmtDate(ev.createdAt)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {siblings.map((s) => (
            <button key={s.evaluationId} className={`chip ${s.evaluationId === record.evaluationId ? "active" : ""}`} onClick={() => onOpen(s.evaluationId)}>
              {s.versionName} · {s.evaluation.hasHold ? "保留" : `${s.evaluation.totalScore}点`}
            </button>
          ))}
        </div>
      </div>

      {ev.provider === "mock" && (
        <div className="banner mock">
          <div className="head"><span className="dot" />モックプロバイダによる疑似結果です</div>
          <div>AI APIは呼び出していません。表示・保存・検証ロジックの動作確認専用で、企画の評価としての意味はありません。</div>
        </div>
      )}

      {ev.hasHold && (
        <div className="banner warn">
          <div className="head"><span className="dot" />採点保留を含むため総合点は表示されません</div>
          <div>
            採点済み{ev.items.length - heldItems.length}項目の小計: <span className="mono" style={{ fontWeight: 700 }}>{ev.scoredSubtotal} /{ev.scoredMaxSubtotal}点</span>
            <span style={{ marginLeft: 8, fontSize: 11 }}>（保留項目は満点換算せず、推定総合点も出しません）</span>
          </div>
          {heldItems.map((i) => (
            <div key={i.itemId} style={{ fontSize: 11 }}>{i.name}: {i.holdDetail}</div>
          ))}
        </div>
      )}

      <div className="result-grid">
        <div className="col">
          <Card pad={false} className="total-card">
            <Eyebrow>総合点</Eyebrow>
            {ev.hasHold ? (
              <div className="total">
                <span className="num" style={{ color: "var(--text-subtle)" }}>—</span>
                <span className="den">保留のため非表示</span>
              </div>
            ) : (
              <div className="total">
                <span className="num">{ev.totalScore}</span>
                <span className="den">/{ev.totalPoints}点</span>
              </div>
            )}
            <div style={{ fontSize: 10, color: "var(--text-subtle)" }}>アプリ側で項目点数を加算</div>
            <div style={{ marginTop: 8 }}>
              <Radar axes={ev.items.map((i) => ({ label: SHORT[i.name] ?? i.name.slice(0, 2), value: i.held ? null : i.score, max: i.maxPoints }))} />
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Eyebrow>総評</Eyebrow>
              <div style={{ fontSize: 13, lineHeight: 1.9, color: "var(--text-body)" }}>{ev.overallComment}</div>
            </div>
          </Card>

          {ev.priorityImprovements.length > 0 && (
            <Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Eyebrow>優先改善</Eyebrow>
                {ev.priorityImprovements.map((k) => {
                  const pg = k.targetPageId ? pageById.get(k.targetPageId) : undefined;
                  return (
                    <div key={k.rank} className="kaizen">
                      <span className="n">{k.rank}</span>
                      <div className="body">
                        <div className="what">{k.change}</div>
                        <div className="sub">
                          {itemName(k.itemId)} ·{" "}
                          {k.targetPageId === null ? "追加ページ" : pg ? <button className="page-btn" onClick={() => openPage(k.targetPageId!)}>P.{pg.pageNumber}</button> : k.targetPageId}
                        </div>
                        <div className="why">{k.reason}</div>
                        <div className="sub">追加確認: {k.infoToConfirm}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Eyebrow>履歴</Eyebrow>
              <div style={{ marginTop: 6 }}>
                {siblings.map((s) => (
                  <div key={s.evaluationId} className="history-row" onClick={() => onOpen(s.evaluationId)}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-strong)" }}>{s.versionName}</span>
                        <Pill tone={s.evaluation.provider === "mock" ? "mock" : "info"} dot={false}>AI参考評価</Pill>
                        {s.evaluationId === record.evaluationId && <span style={{ fontSize: 10, color: "var(--teal-700)" }}>表示中</span>}
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-subtle)" }}>{fmtDate(s.createdAt)}</div>
                    </div>
                    <span className="mono" style={{ flex: "none", fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>
                      {s.evaluation.hasHold ? <span style={{ color: "var(--status-warn-fg)", fontSize: 12, fontWeight: 500 }}>保留</span> : s.evaluation.totalScore}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-subtle)", paddingTop: 8, lineHeight: 1.6 }}>
                評価は追記型で保存され、AI参考評価は変更できません。
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Eyebrow>費用・利用量</Eyebrow>
              <div className="hairline-row"><span>入力トークン</span><span className="mono">{ev.usage.inputTokens.toLocaleString()}</span></div>
              <div className="hairline-row"><span>出力トークン</span><span className="mono">{ev.usage.outputTokens.toLocaleString()}</span></div>
              <div className="hairline-row"><span>推定費用</span><span className="mono">{ev.usage.estimatedCostUsd === null ? "推定不可" : `$${ev.usage.estimatedCostUsd.toFixed(4)}`}</span></div>
              <div className="hairline-row"><span>処理時間</span><span className="mono">{typeof ev.modelSettings.elapsedMs === "number" ? `${(ev.modelSettings.elapsedMs / 1000).toFixed(1)}秒` : "不明"}</span></div>
              <div style={{ fontSize: 10, color: "var(--text-subtle)", lineHeight: 1.6 }}>{ev.usage.pricingNote}</div>
              <div className="reading" style={{ marginTop: 4 }}>
                {ev.pageReading.map((p) => (
                  <Pill key={p.pageId} tone={p.textStatus === "image_only" ? "warn" : p.textStatus === "ocr" ? "info" : "neutral"} dot={false}>
                    P.{p.pageNumber} {TEXT_STATUS_LABEL[p.textStatus]}
                  </Pill>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="col" style={{ gap: 10 }}>
          <Eyebrow>項目別評価</Eyebrow>
          {ev.items.map((it) => {
            const rate = it.score === null ? 0 : Math.round((it.score / it.maxPoints) * 100);
            const es = EVIDENCE_LABEL[it.evidenceStatus];
            const open = !!expanded[it.itemId];
            return (
              <Card key={it.itemId} pad={false} className="item-card">
                <div className="item-head" onClick={() => setExpanded((s) => ({ ...s, [it.itemId]: !open }))}>
                  <div className="row">
                    <span className="name">{it.name}</span>
                    {it.held ? (
                      <Pill tone="warn">保留</Pill>
                    ) : (
                      <span className="score">
                        {it.score}
                        <small> /{it.maxPoints}点</small>
                        <small style={{ marginLeft: 6 }}>（{rate}%）</small>
                      </span>
                    )}
                  </div>
                  <div className="progress"><div style={{ width: `${it.held ? 0 : rate}%` }} /></div>
                  {!open && <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }} className="ellipsis">{it.reason}</div>}
                </div>
                {open && (
                  <div className="item-body">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Pill tone="neutral" dot={false}>{JUDGEMENT_LABEL[it.judgement]}</Pill>
                      <Pill tone={es.tone}>根拠: {es.text}</Pill>
                    </div>
                    {it.held && <div className="banner warn" style={{ padding: "10px 12px" }}>{it.holdDetail}</div>}
                    <div className="reason">{it.reason}</div>
                    <div className="ev-list">
                      {it.evidence.length === 0 ? (
                        <div className="ev">
                          <div className="row"><span className="label">根拠</span><span className="type">資料全体で記載を確認できない</span></div>
                        </div>
                      ) : (
                        it.evidence.map((e, i) => (
                          <div key={i} className="ev">
                            <div className="row">
                              <span className="label">根拠</span>
                              {e.pageNumber !== null ? (
                                <button className="page-btn" onClick={() => openPage(e.pageId)}>P.{e.pageNumber}</button>
                              ) : (
                                <Pill tone="err">ページID {e.pageId} は存在しません</Pill>
                              )}
                              <span className="type">{e.type === "quote" ? "本文引用" : "図表説明"}</span>
                              {e.type === "quote" && !e.verified && <Pill tone="err">照合不能</Pill>}
                            </div>
                            <div className="quote">{e.type === "quote" ? `「${e.text}」` : e.text}</div>
                          </div>
                        ))
                      )}
                    </div>
                    {(it.strengths.length > 0 || it.gaps.length > 0 || it.suggestions.length > 0) && (
                      <div className="detail-grid">
                        {it.strengths.length > 0 && (
                          <div><span className="h good">評価できる点</span>{it.strengths.map((s, i) => <span key={i} className="line">· {s}</span>)}</div>
                        )}
                        {it.gaps.length > 0 && (
                          <div><span className="h lack">不足している点</span>{it.gaps.map((s, i) => <span key={i} className="line">· {s}</span>)}</div>
                        )}
                        {it.suggestions.length > 0 && (
                          <div><span className="h fix">改善案</span>{it.suggestions.map((s, i) => <span key={i} className="line">· {s}</span>)}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
          <div className="sunken">{ev.notice}</div>
        </div>
      </div>
    </div>
  );
}
