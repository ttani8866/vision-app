"use client";

const STEPS = ["資料を読み取り中", "基準と照合中", "評価結果を作成中"];

// 処理段階のみ表示し、架空の完了率は表示しない（§6-2）
export default function ScoringView({ stage, message, error, onRetry, onBack }: { stage: number; message: string; error: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="scoring">
      <div className="title">{error ? "採点失敗" : "採点しています"}</div>
      <div className="steps">
        {STEPS.map((label, i) => {
          const cls = error ? (i < stage ? "done" : "todo") : i < stage ? "done" : i === stage ? "current" : "todo";
          return (
            <div key={label} className={`step ${cls}`}>
              <span className="dot" />
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      {error ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", maxWidth: 560 }}>
          <div className="banner err" style={{ width: "100%", whiteSpace: "pre-wrap" }}>
            <div className="head"><span className="dot" />採点に失敗しました。結果は保存していません</div>
            <div>{error}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={onRetry}>再試行</button>
            <button className="btn secondary" onClick={onBack}>戻る</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "var(--text-subtle)", textAlign: "center", lineHeight: 1.7, maxWidth: 480 }}>
          {message}
          <br />
          処理段階の表示です。完了率は表示しません。
        </div>
      )}
    </div>
  );
}
