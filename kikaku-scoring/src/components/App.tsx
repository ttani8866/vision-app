"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  findByCacheKey,
  getEvaluation,
  listEvaluations,
  makeCacheKey,
  saveEvaluation,
  saveFile,
  sha256OfFile,
  type StoredEvaluation,
} from "@/lib/db";
import type { AnalyzeResponse, CriteriaSet, ScoreRequest, ScoreResponse, ServerConfig } from "@/lib/types";
import ResultView from "./ResultView";

type Phase = "idle" | "hashing" | "reading" | "scoring" | "saving" | "done" | "error";

const PHASE_STEPS: { key: Phase[]; label: string }[] = [
  { key: ["hashing", "reading"], label: "資料を読み取り中" },
  { key: ["scoring"], label: "基準と照合し評価結果を作成中" },
  { key: ["saving", "done"], label: "保存・表示" },
];

export default function App() {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [sets, setSets] = useState<CriteriaSet[]>([]);
  const [setKey, setSetKey] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [versionName, setVersionName] = useState("v1");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [current, setCurrent] = useState<StoredEvaluation | null>(null);
  const [history, setHistory] = useState<StoredEvaluation[]>([]);
  const running = useRef(false);

  const refreshConfig = useCallback(async () => {
    const c = (await fetch("/api/config").then((r) => r.json())) as ServerConfig;
    setConfig(c);
  }, []);

  useEffect(() => {
    refreshConfig().catch(() => setError("サーバー設定を取得できませんでした"));
    fetch("/api/criteria")
      .then((r) => r.json())
      .then((j: { ok: boolean; sets?: CriteriaSet[]; error?: string }) => {
        if (!j.ok || !j.sets) throw new Error(j.error ?? "基準セットの取得に失敗");
        setSets(j.sets);
        if (j.sets.length > 0) setSetKey(`${j.sets[0].setId}|${j.sets[0].version}`);
      })
      .catch((e) => setError((e as Error).message));
    listEvaluations().then(setHistory).catch(() => {});
  }, [refreshConfig]);

  const selectedSet = sets.find((s) => `${s.setId}|${s.version}` === setKey) ?? null;
  const busy = phase !== "idle" && phase !== "done" && phase !== "error";

  const onFile = (f: File | null) => {
    setFile(f);
    if (f && !projectName) setProjectName(f.name.replace(/\.pdf$/i, ""));
  };

  // 「AIで採点する」を押した時のみ実行（§6-2）。連打防止のため running フラグで二重実行を防ぐ
  const run = async (force: boolean) => {
    if (running.current || !file || !selectedSet || !config) return;
    running.current = true;
    setError("");
    setCurrent(null);
    try {
      setPhase("hashing");
      setMessage("ファイルの識別子を計算しています");
      const fileHash = await sha256OfFile(file);
      const cacheKey = makeCacheKey(fileHash, selectedSet.setId, selectedSet.version, config.provider, config.modelId, config.imageDetail);

      if (!force) {
        const cached = await findByCacheKey(cacheKey);
        if (cached) {
          setCurrent(cached);
          setPhase("done");
          setMessage("同一ファイル・同一基準セット・同一モデル設定の保存済み結果を表示しました（再採点は行っていません。費用は発生していません）");
          return;
        }
      }

      setPhase("reading");
      setMessage("資料を解析サーバーに送信し、ページごとにテキストと画像を読み取っています");
      const fd = new FormData();
      fd.append("file", file);
      const an = (await fetch("/api/analyze", { method: "POST", body: fd }).then((r) => r.json())) as AnalyzeResponse;
      if (!an.ok) throw new Error(`[${an.code}] ${an.error}`);
      const doc = an.document;

      setPhase("scoring");
      setMessage(`AI提供元（${config.provider} / ${config.modelId}）に ${doc.pageCount} ページを送信し、基準と照合して評価結果を作成しています。資料規模により数十秒〜数分かかります`);
      const req: ScoreRequest = {
        criteriaSetId: selectedSet.setId,
        criteriaVersion: selectedSet.version,
        fileHash: doc.fileHash,
        pages: doc.pages.map((p) => ({ pageId: p.pageId, pageNumber: p.pageNumber, text: p.text, textStatus: p.textStatus, image: p.image })),
      };
      const sc = (await fetch("/api/score", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req) }).then((r) =>
        r.json(),
      )) as ScoreResponse;
      if (!sc.ok) throw new Error(`[${sc.code}] ${sc.error}${sc.detail ? `\n${sc.detail}` : ""}`);

      setPhase("saving");
      const rec: StoredEvaluation = {
        evaluationId: sc.evaluation.evaluationId,
        cacheKey,
        projectName: projectName.trim() || file.name,
        versionName: versionName.trim() || "v1",
        fileName: file.name,
        fileHash: doc.fileHash,
        pageCount: doc.pageCount,
        pages: doc.pages.map((p) => ({ pageId: p.pageId, pageNumber: p.pageNumber, image: p.image })),
        evaluation: sc.evaluation,
        createdAt: sc.evaluation.createdAt,
      };
      await saveEvaluation(rec);
      const savedFile = await saveFile(doc.fileHash, file.name, file);
      setCurrent(rec);
      setHistory(await listEvaluations());
      setPhase("done");
      setMessage(savedFile ? "採点が完了し、結果と元ファイルを端末内に保存しました" : "採点は完了しましたが元ファイルの保存に失敗しました。次回閲覧時はファイルの再アップロードが必要です");
      refreshConfig().catch(() => {});
    } catch (e) {
      setPhase("error");
      setError((e as Error).message);
      setMessage("採点失敗。結果は保存していません。再試行は「AIで採点する」を押してください");
    } finally {
      running.current = false;
    }
  };

  const openHistory = async (id: string) => {
    const rec = await getEvaluation(id);
    if (rec) {
      setCurrent(rec);
      setPhase("done");
      setMessage("保存済み結果を表示しています（再採点はしていません）");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="container">
      <div className="topbar">
        <h1>企画書AI採点エンジン <small>段階1</small></h1>
        {config && (
          <small>
            AI: {config.provider} / {config.modelId}（画像 {config.imageDetail}）／ OCR: {config.ocrEnabled ? "有効" : "無効"}／ 累計推定費用 ${config.usage.totalCostUsd.toFixed(4)}
            {config.usage.limitUsd !== null && ` ／ 上限 $${config.usage.limitUsd}`}
            {config.usage.limitReached && <span className="tag bad">上限到達</span>}
          </small>
        )}
      </div>

      {config?.provider === "mock" && (
        <div className="mock" style={{ marginBottom: 14 }}>
          現在はモックプロバイダで動作しています。AI APIは呼び出されず、結果は疑似データです。実運用は .env.local の AI_PROVIDER を openai にし、OPENAI_API_KEY を設定してください。
        </div>
      )}

      <div className="panel">
        <h2>採点する企画書</h2>
        <div className="grid2">
          <div>
            <div className="field">
              <label>基準セット（配点は固定。採点時に変更できません）</label>
              <select value={setKey} onChange={(e) => setSetKey(e.target.value)} disabled={busy}>
                {sets.map((s) => (
                  <option key={`${s.setId}|${s.version}`} value={`${s.setId}|${s.version}`}>
                    {s.name}（{s.setId} v{s.version}、{s.totalPoints}点）
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>企画書PDF（最大20MB・50ページ、パスワードなし）</label>
              <input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div>
            <div className="field">
              <label>企画名</label>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} disabled={busy} placeholder="ファイル名が初期値になります" />
            </div>
            <div className="field">
              <label>版名</label>
              <input value={versionName} onChange={(e) => setVersionName(e.target.value)} disabled={busy} />
            </div>
          </div>
        </div>

        {selectedSet && (
          <details style={{ marginBottom: 10 }}>
            <summary>評価項目と配点を確認する</summary>
            <table style={{ marginTop: 6 }}>
              <thead><tr><th>項目</th><th>配点</th><th>基準文</th></tr></thead>
              <tbody>
                {selectedSet.items.map((it) => (
                  <tr key={it.itemId}><td>{it.name}</td><td>{it.maxPoints}</td><td>{it.criteria.map((c, i) => <div key={i}>{c}</div>)}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        )}

        <div className="note" style={{ marginBottom: 12 }}>
          送信先と送信内容の確認（採点開始で次の送信が行われます）
          <ul style={{ marginBottom: 0 }}>
            <li>送信先1: 本アプリの解析サーバー。PDF全体を送信し、ページごとのテキストと画像に変換します。一時ファイルは作らず、応答後に資料を保持しません</li>
            <li>送信先2: AI提供元（{config ? `${config.provider} / ${config.modelId}` : "取得中"}）。全ページの抽出テキストとページ画像を送信します。応答の保存を無効化して送信しますが、提供元の監視ログ等の保持は一律にはなくならないため「完全に保存されない」ことは保証しません</li>
            <li>提供元アカウントのデータ保持・学習共有の実設定は本書作成時点で未確認です。実運用前に管理者が確認し記録してください</li>
            <li>結果と元ファイルは操作中の端末（ブラウザ内領域）に保存され、サーバーには残りません</li>
          </ul>
        </div>

        <div className="row">
          <button className="btn" disabled={busy || !file || !selectedSet || !config || config.usage.limitReached} onClick={() => run(false)}>
            AIで採点する
          </button>
          <button className="btn secondary" disabled={busy || !file || !selectedSet || !config || config.usage.limitReached} onClick={() => run(true)} title="保存済み結果があっても新規に評価を作ります。過去結果は残ります">
            再採点（新規評価を作成）
          </button>
          {config?.usage.limitReached && <span className="tag bad">利用上限に到達したため採点を停止しています</span>}
        </div>

        {phase !== "idle" && (
          <div style={{ marginTop: 12 }}>
            <div className="status">
              {PHASE_STEPS.map((s, i) => {
                const idx = PHASE_STEPS.findIndex((x) => x.key.includes(phase));
                const cls = phase === "error" ? "" : s.key.includes(phase) ? "active" : i < idx ? "done" : "";
                return <span key={s.label} className={`step ${cls}`}>{s.label}</span>;
              })}
            </div>
            <p style={{ marginTop: 8 }}><small>{message}</small></p>
            {error && <div className="error">{error}</div>}
          </div>
        )}
      </div>

      {current && <ResultView record={current} />}

      <div className="panel">
        <h2>履歴（この端末に保存された評価）</h2>
        {history.length === 0 ? (
          <p className="muted">まだ評価がありません</p>
        ) : (
          <table>
            <thead>
              <tr><th>企画名</th><th>版名</th><th>総合点</th><th>評価種別</th><th>日時</th><th>基準セット</th><th>モデル</th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.evaluationId} className="clickable" onClick={() => openHistory(h.evaluationId)}>
                  <td>{h.projectName}</td>
                  <td>{h.versionName}</td>
                  <td>{h.evaluation.hasHold ? <span className="tag bad">保留あり（小計 {h.evaluation.scoredSubtotal}／{h.evaluation.scoredMaxSubtotal}）</span> : `${h.evaluation.totalScore}／${h.evaluation.totalPoints}`}</td>
                  <td>AI参考評価{h.evaluation.provider === "mock" && <span className="tag">モック</span>}</td>
                  <td>{new Date(h.createdAt).toLocaleString("ja-JP")}</td>
                  <td>{h.evaluation.criteriaSetId} v{h.evaluation.criteriaVersion}</td>
                  <td>{h.evaluation.modelId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
