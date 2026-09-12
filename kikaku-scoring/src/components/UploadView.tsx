"use client";
import { useRef, useState } from "react";
import type { CriteriaSet, ServerConfig } from "@/lib/types";
import { Card, Eyebrow, Pill } from "./ui";

export type UploadSubmit = { file: File; projectName: string; versionName: string; set: CriteriaSet; force: boolean };

export default function UploadView({
  sets,
  config,
  onSubmit,
  disabledReason,
}: {
  sets: CriteriaSet[];
  config: ServerConfig | null;
  onSubmit: (s: UploadSubmit) => void;
  disabledReason: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [versionName, setVersionName] = useState("v1");
  const [setKey, setSetKey] = useState(sets.length ? `${sets[0].setId}|${sets[0].version}` : "");
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedSet = sets.find((s) => `${s.setId}|${s.version}` === setKey) ?? null;

  const pick = (f: File | null) => {
    setFile(f);
    if (f && !projectName) setProjectName(f.name.replace(/\.pdf$/i, ""));
  };
  const ready = !!file && !!selectedSet && !disabledReason;
  const submit = (force: boolean) => {
    if (!file || !selectedSet) return;
    onSubmit({ file, projectName: projectName.trim() || file.name, versionName: versionName.trim() || "v1", set: selectedSet, force });
  };

  return (
    <div className="upload-grid">
      <div className="col">
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Eyebrow>企画書PDF</Eyebrow>
            {file ? (
              <div className="file-row">
                <div className="icon">PDF</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
                  <div className="fname">{file.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {(file.size / 1024 / 1024).toFixed(1)}MB · ページ数は採点開始時の解析で確定
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Pill tone={file.size > (config?.limits.maxFileBytes ?? Infinity) ? "err" : "ok"}>
                      {file.size > (config?.limits.maxFileBytes ?? Infinity) ? "20MBを超えています" : "受付可"}
                    </Pill>
                    <button className="btn secondary" style={{ minHeight: 28, padding: "0 10px", fontSize: 11 }} onClick={() => inputRef.current?.click()}>
                      別のファイルを選ぶ
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`dropzone ${over ? "over" : ""}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0] ?? null); }}
              >
                <div className="icon">PDF</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)" }}>ファイルを選択、またはここにドロップ</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>PDF · 1回1ファイル · 最大20MB / 50ページ · パスワードなし</div>
              </div>
            )}
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="field">
              <span>企画名</span>
              <input className="input" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="ファイル名が初期値になります" />
            </label>
            <label className="field">
              <span>版名</span>
              <input className="input mono" value={versionName} onChange={(e) => setVersionName(e.target.value)} />
            </label>
            <label className="field">
              <span>基準セット（配点は固定。採点時に変更できません）</span>
              <select className="input" value={setKey} onChange={(e) => setSetKey(e.target.value)}>
                {sets.map((s) => (
                  <option key={`${s.setId}|${s.version}`} value={`${s.setId}|${s.version}`}>
                    {s.name}（{s.setId} v{s.version} · {s.totalPoints}点）
                  </option>
                ))}
              </select>
            </label>
            {selectedSet && (
              <div>
                {selectedSet.items.map((it) => (
                  <div key={it.itemId} className="hairline-row">
                    <span style={{ color: "var(--text-body)" }}>{it.name}</span>
                    <span className="mono" style={{ color: "var(--text-strong)", fontWeight: 700 }}>{it.maxPoints}点</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="col">
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Eyebrow>送信先と送信内容</Eyebrow>
            <div style={{ fontSize: 12, color: "var(--text-body)", lineHeight: 1.7 }}>採点開始で、資料を解析サーバーとAI提供元へ送信します。</div>
            <ul className="note-list">
              <li>送信先1: 本アプリの解析サーバー。PDF全体を送信し、ページごとのテキストと画像に変換します。一時ファイルは作らず、応答後に資料を保持しません</li>
              <li>送信先2: AI提供元（{config ? `${config.provider} / ${config.modelId}` : "取得中"}）。全ページの抽出テキストとページ画像を送信します。応答の保存を無効化して送信しますが、提供元の監視ログ等の保持は一律にはなくならないため「完全に保存されない」ことは保証しません</li>
              <li>提供元アカウントのデータ保持・学習共有の実設定は未確認です。実運用前に管理者が確認し記録します</li>
              <li>結果と元ファイルは操作中の端末（ブラウザ内領域）に保存され、サーバーには残りません</li>
            </ul>
          </div>
        </Card>

        {disabledReason && <div className="banner err"><div className="head"><span className="dot" />{disabledReason}</div></div>}

        <button className="btn lg" disabled={!ready} onClick={() => submit(false)}>
          AIで採点する
        </button>
        <button className="btn secondary" disabled={!ready} onClick={() => submit(true)} title="同一ファイル・同一基準・同一モデル設定の保存済み結果があっても新規に評価を作ります。過去の結果は残ります">
          再採点（保存済み結果があっても新規評価を作成）
        </button>
        <div style={{ fontSize: 10.5, color: "var(--text-subtle)", lineHeight: 1.7 }}>
          同一ファイル・同一基準セット・同一モデル設定の保存済み結果がある場合、「AIで採点する」は再採点せず保存結果を表示します（費用は発生しません）。
        </div>
      </div>
    </div>
  );
}
