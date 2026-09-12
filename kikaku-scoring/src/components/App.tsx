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
import ListView from "./ListView";
import ResultView from "./ResultView";
import ScoringView from "./ScoringView";
import SettingsView from "./SettingsView";
import UploadView, { type UploadSubmit } from "./UploadView";
import { BackIcon, NavIcons, Pill } from "./ui";

type View = "list" | "upload" | "scoring" | "result" | "settings";

const TITLES: Record<View, string> = { list: "企画一覧", upload: "新規採点", scoring: "採点中", result: "評価結果", settings: "設定" };

export default function App() {
  const [view, setView] = useState<View>("list");
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [sets, setSets] = useState<CriteriaSet[]>([]);
  const [history, setHistory] = useState<StoredEvaluation[]>([]);
  const [current, setCurrent] = useState<StoredEvaluation | null>(null);
  const [stage, setStage] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const lastSubmit = useRef<UploadSubmit | null>(null);
  const running = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  const refreshConfig = useCallback(async () => {
    const c = (await fetch("/api/config").then((r) => r.json())) as ServerConfig;
    setConfig(c);
  }, []);

  useEffect(() => {
    refreshConfig().catch(() => setLoadError("サーバー設定を取得できませんでした"));
    fetch("/api/criteria")
      .then((r) => r.json())
      .then((j: { ok: boolean; sets?: CriteriaSet[]; error?: string }) => {
        if (!j.ok || !j.sets) throw new Error(j.error ?? "基準セットの取得に失敗");
        setSets(j.sets);
      })
      .catch((e) => setLoadError((e as Error).message));
    listEvaluations().then(setHistory).catch(() => {});
  }, [refreshConfig]);

  const openEvaluation = async (id: string) => {
    const rec = await getEvaluation(id);
    if (!rec) return;
    setCurrent(rec);
    setView("result");
    window.scrollTo({ top: 0 });
  };

  // 「AIで採点する」を押した時のみ実行（§6-2）。running フラグで二重実行を防ぐ
  const run = async (s: UploadSubmit) => {
    if (running.current || !config) return;
    running.current = true;
    lastSubmit.current = s;
    setError("");
    setView("scoring");
    setStage(0);
    try {
      setMessage("ファイルの識別子を計算し、解析サーバーでページごとにテキストと画像を読み取っています");
      const fileHash = await sha256OfFile(s.file);
      const cacheKey = makeCacheKey(fileHash, s.set.setId, s.set.version, config.provider, config.modelId, config.imageDetail);

      if (!s.force) {
        const cached = await findByCacheKey(cacheKey);
        if (cached) {
          setCurrent(cached);
          setView("result");
          showToast("同一条件の保存済み結果を表示しました（再採点なし・費用なし）");
          return;
        }
      }

      const fd = new FormData();
      fd.append("file", s.file);
      const an = (await fetch("/api/analyze", { method: "POST", body: fd }).then((r) => r.json())) as AnalyzeResponse;
      if (!an.ok) throw new Error(`[${an.code}] ${an.error}`);
      const doc = an.document;

      setStage(1);
      setMessage(`AI提供元（${config.provider} / ${config.modelId}）に ${doc.pageCount} ページを送信し、基準と照合しています。資料規模により数十秒〜数分かかります`);
      const req: ScoreRequest = {
        criteriaSetId: s.set.setId,
        criteriaVersion: s.set.version,
        fileHash: doc.fileHash,
        pages: doc.pages.map((p) => ({ pageId: p.pageId, pageNumber: p.pageNumber, text: p.text, textStatus: p.textStatus, image: p.image })),
      };
      const sc = (await fetch("/api/score", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req) }).then((r) =>
        r.json(),
      )) as ScoreResponse;
      if (!sc.ok) throw new Error(`[${sc.code}] ${sc.error}${sc.detail ? `\n${sc.detail}` : ""}`);

      setStage(2);
      setMessage("評価結果を保存しています");
      const rec: StoredEvaluation = {
        evaluationId: sc.evaluation.evaluationId,
        cacheKey,
        projectName: s.projectName,
        versionName: s.versionName,
        fileName: s.file.name,
        fileHash: doc.fileHash,
        pageCount: doc.pageCount,
        pages: doc.pages.map((p) => ({ pageId: p.pageId, pageNumber: p.pageNumber, image: p.image })),
        evaluation: sc.evaluation,
        createdAt: sc.evaluation.createdAt,
      };
      await saveEvaluation(rec);
      const savedFile = await saveFile(doc.fileHash, s.file.name, s.file);
      setHistory(await listEvaluations());
      setCurrent(rec);
      setView("result");
      showToast(savedFile ? "採点が完了しました。結果と元ファイルを端末内に保存しました" : "採点は完了しましたが元ファイルの保存に失敗しました。次回は再アップロードが必要です");
      refreshConfig().catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      running.current = false;
    }
  };

  const disabledReason = !config ? "サーバー設定を取得中です" : config.usage.limitReached ? `利用上限（$${config.usage.limitUsd}）に到達したため採点を停止しています。管理者に連絡してください` : loadError || null;
  const siblings = current ? history.filter((h) => h.projectName === current.projectName) : [];
  const activeNav = view === "settings" ? "settings" : "list";
  const usage = config?.usage;
  const usagePct = usage && usage.limitUsd ? Math.min(100, Math.round((usage.totalCostUsd / usage.limitUsd) * 100)) : 0;

  return (
    <div className="shell">
      {toast && <div className="toast">{toast}</div>}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="name">企画書AI採点</div>
          <div className="sub">AI PROPOSAL SCORING · 段階1</div>
        </div>
        <button className={`nav-btn ${activeNav === "list" ? "active" : ""}`} onClick={() => setView("list")}>
          {NavIcons.list}
          <span>企画一覧</span>
        </button>
        <button className="nav-btn" disabled title="段階2で実装">
          {NavIcons.compare}
          <span>比較</span>
          <span className="badge">段階2</span>
        </button>
        <button className={`nav-btn ${activeNav === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
          {NavIcons.settings}
          <span>設定</span>
        </button>
        <div className="sidebar-usage">
          <div className="row">
            <span className="label">累計の利用</span>
            <span className="value">{usage ? `$${usage.totalCostUsd.toFixed(2)} / ${usage.limitUsd === null ? "—" : `$${usage.limitUsd.toFixed(2)}`}` : "…"}</span>
          </div>
          <div className="bar"><div style={{ width: `${usagePct}%` }} /></div>
          <div className="note">{config ? `${config.provider} / ${config.modelId}` : ""}</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="title">
            {(view === "upload" || view === "result" || (view === "scoring" && error)) && (
              <button className="back" aria-label="企画一覧へ戻る" onClick={() => setView("list")}><BackIcon /></button>
            )}
            <span className="ellipsis">{TITLES[view]}</span>
          </div>
          <div className="actions">
            {config?.provider === "mock" && <Pill tone="mock">モック動作中</Pill>}
            {sets[0] && (
              <Pill tone="brand">
                {sets[0].name.split("（")[0]} v{sets[0].version} · {sets[0].totalPoints}点
              </Pill>
            )}
            {view !== "upload" && view !== "scoring" && (
              <button className="btn" onClick={() => setView("upload")} disabled={!!disabledReason}>新しい企画書を採点</button>
            )}
          </div>
        </header>

        <main className="content">
          {loadError && <div className="banner err" style={{ marginBottom: 16 }}><div className="head"><span className="dot" />{loadError}</div></div>}
          {config?.provider === "mock" && view === "list" && (
            <div className="banner mock" style={{ marginBottom: 16 }}>
              <div className="head"><span className="dot" />モックプロバイダで動作しています</div>
              <div>AI APIは呼び出されず、結果は疑似データです。実運用は .env.local の AI_PROVIDER を openai にし、OPENAI_API_KEY を設定してください。</div>
            </div>
          )}
          {view === "list" && <ListView history={history} onOpen={openEvaluation} onNew={() => setView("upload")} />}
          {view === "upload" && <UploadView sets={sets} config={config} onSubmit={run} disabledReason={disabledReason} />}
          {view === "scoring" && (
            <ScoringView
              stage={stage}
              message={message}
              error={error}
              onRetry={() => lastSubmit.current && run(lastSubmit.current)}
              onBack={() => { setError(""); setView("upload"); }}
            />
          )}
          {view === "result" && current && <ResultView record={current} siblings={siblings} onOpen={openEvaluation} />}
          {view === "settings" && <SettingsView sets={sets} config={config} />}
        </main>
      </div>
    </div>
  );
}
