"use client";
import { useState } from "react";
import type { StoredEvaluation, StoredPage } from "@/lib/db";
import type { ItemResult } from "@/lib/types";
import PageViewer from "./PageViewer";

const JUDGEMENT_LABEL: Record<ItemResult["judgement"], string> = {
  confirmed: "根拠を確認できた",
  insufficient: "全体を読めたが説明不足",
  unreadable: "文字や図が読めず判断できない",
};
const EVIDENCE_LABEL: Record<ItemResult["evidenceStatus"], { text: string; cls: string }> = {
  recorded: { text: "記載あり", cls: "good" },
  insufficient: { text: "記載不足", cls: "warn" },
  unreadable: { text: "読み取り不可", cls: "bad" },
};
const TEXT_STATUS_LABEL = { text: "文字あり", ocr: "OCR", image_only: "画像のみ" } as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP");
}

export default function ResultView({ record }: { record: StoredEvaluation }) {
  const ev = record.evaluation;
  const [viewer, setViewer] = useState<StoredPage | null>(null);
  const pageById = new Map(record.pages.map((p) => [p.pageId, p]));
  const itemName = (id: string) => ev.items.find((i) => i.itemId === id)?.name ?? id;

  const openPage = (pageId: string) => {
    const p = pageById.get(pageId);
    if (p) setViewer(p);
  };

  return (
    <div>
      {viewer && <PageViewer page={viewer} onClose={() => setViewer(null)} />}

      <div className="panel">
        <div className="topbar">
          <div>
            <h2 style={{ marginBottom: 2 }}>{record.projectName} <small>／ {record.versionName}</small></h2>
            <small>
              <span className="tag">AI参考評価</span>
              基準セット: {ev.criteriaSetId} v{ev.criteriaVersion}（{ev.criteriaName}）／ モデル: {ev.modelId}（{ev.provider}）／ {fmtDate(ev.createdAt)}
            </small>
          </div>
        </div>

        {ev.provider === "mock" && (
          <div className="mock" style={{ marginBottom: 12 }}>
            この結果はモックプロバイダで生成した疑似結果です。AI APIは呼び出していません。表示・保存・検証ロジックの動作確認専用で、企画の評価としての意味はありません。
          </div>
        )}

        <div className="scorehead">
          {ev.hasHold ? (
            <div className="hold" style={{ flex: 1 }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>採点保留を含むため総合点は表示しません</div>
              <div>
                採点済み項目の小計: <span style={{ fontSize: 22 }}>{ev.scoredSubtotal}</span>／{ev.scoredMaxSubtotal}点
                <small>（保留項目は満点換算せず、推定総合点も出しません）</small>
              </div>
              <ul>
                {ev.items.filter((i) => i.held).map((i) => (
                  <li key={i.itemId}>{i.name}: {i.holdDetail}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <div className="muted" style={{ fontSize: 13 }}>総合点（AI参考評価、アプリ側で項目点数を加算）</div>
              <div className="total">
                {ev.totalScore}
                <small> ／ {ev.totalPoints}点</small>
              </div>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 260 }}>
            <h3>総評</h3>
            <p>{ev.overallComment}</p>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <small>
            読み取り状態:{" "}
            {ev.pageReading.map((p) => (
              <span key={p.pageId} className={`tag ${p.textStatus === "image_only" ? "warn" : ""}`}>
                p{p.pageNumber} {TEXT_STATUS_LABEL[p.textStatus]}
              </span>
            ))}
            {ev.unreadablePageIds.length > 0 && <span> ／ AIが判読不能と報告したページ: {ev.unreadablePageIds.join(", ")}</span>}
          </small>
        </div>
      </div>

      <div className="panel">
        <h2>項目別評価</h2>
        {ev.items.map((it) => {
          const rate = it.score === null ? 0 : Math.round((it.score / it.maxPoints) * 100);
          const es = EVIDENCE_LABEL[it.evidenceStatus];
          return (
            <div key={it.itemId} className={`item ${it.held ? "held" : ""}`}>
              <div className="item-head">
                <h3 style={{ margin: 0 }}>{it.name}</h3>
                <div>
                  {it.held ? (
                    <span className="tag bad">保留</span>
                  ) : (
                    <span className="item-score">
                      {it.score}／{it.maxPoints}点 <small>（達成率 {rate}%）</small>
                    </span>
                  )}
                </div>
              </div>
              <div className="bar"><div style={{ width: `${it.held ? 0 : rate}%` }} /></div>
              <div style={{ marginBottom: 6 }}>
                <span className="tag">{JUDGEMENT_LABEL[it.judgement]}</span>
                <span className={`tag ${es.cls}`}>根拠: {es.text}</span>
              </div>
              {it.held && <div className="hold" style={{ marginBottom: 8, fontSize: 14 }}>{it.holdDetail}</div>}
              <p>{it.reason}</p>

              <h3 style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 2px" }}>根拠の位置</h3>
              {it.evidence.length === 0 ? (
                <p className="muted" style={{ fontSize: 14 }}>資料全体で記載を確認できない</p>
              ) : (
                <ul className="evidence">
                  {it.evidence.map((e, i) => (
                    <li key={i}>
                      {e.pageNumber !== null ? (
                        <button className="pagelink" onClick={() => openPage(e.pageId)}>{e.pageNumber}ページ</button>
                      ) : (
                        <span className="tag bad">ページID {e.pageId} は存在しません</span>
                      )}
                      {e.type === "quote" ? (
                        <span className="quote">「{e.text}」{!e.verified && <span className="tag bad">照合不能</span>}</span>
                      ) : (
                        <span className="figure">図表説明: {e.text}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="cols3">
                <div>
                  <h3 style={{ fontSize: 13, color: "var(--muted)" }}>評価できる点</h3>
                  {it.strengths.length ? <ul>{it.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p className="muted">なし</p>}
                </div>
                <div>
                  <h3 style={{ fontSize: 13, color: "var(--muted)" }}>不足している点</h3>
                  {it.gaps.length ? <ul>{it.gaps.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p className="muted">なし</p>}
                </div>
                <div>
                  <h3 style={{ fontSize: 13, color: "var(--muted)" }}>改善案</h3>
                  {it.suggestions.length ? <ul>{it.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p className="muted">なし</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h2>優先改善（最大3件）</h2>
        {ev.priorityImprovements.length === 0 ? (
          <p className="muted">なし</p>
        ) : (
          <table>
            <thead>
              <tr><th>順位</th><th>対象項目</th><th>対象ページ</th><th>修正内容</th><th>優先する理由</th><th>追加確認する情報</th></tr>
            </thead>
            <tbody>
              {ev.priorityImprovements.map((p) => {
                const pg = p.targetPageId ? pageById.get(p.targetPageId) : undefined;
                return (
                  <tr key={p.rank}>
                    <td>{p.rank}</td>
                    <td>{itemName(p.itemId)}</td>
                    <td>{p.targetPageId === null ? "追加ページ" : pg ? <button className="pagelink" onClick={() => openPage(p.targetPageId!)}>{pg.pageNumber}ページ</button> : p.targetPageId}</td>
                    <td>{p.change}</td>
                    <td>{p.reason}</td>
                    <td>{p.infoToConfirm}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>費用・利用量</h2>
        <table>
          <tbody>
            <tr><th>入力トークン</th><td>{ev.usage.inputTokens.toLocaleString()}</td></tr>
            <tr><th>出力トークン</th><td>{ev.usage.outputTokens.toLocaleString()}</td></tr>
            <tr><th>推定費用</th><td>{ev.usage.estimatedCostUsd === null ? "推定不可" : `$${ev.usage.estimatedCostUsd.toFixed(4)}`} <small>（{ev.usage.pricingNote}）</small></td></tr>
            <tr><th>処理時間</th><td>{typeof ev.modelSettings.elapsedMs === "number" ? `${(ev.modelSettings.elapsedMs / 1000).toFixed(1)}秒` : "不明"}</td></tr>
            <tr><th>モデル設定</th><td><small>{JSON.stringify(ev.modelSettings)}</small></td></tr>
            <tr><th>評価ID</th><td><small>{ev.evaluationId}</small></td></tr>
          </tbody>
        </table>
        <div className="disclaimer">{ev.notice}</div>
      </div>
    </div>
  );
}
