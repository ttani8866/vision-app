r"""
VX 経営意思決定パネル用: KANBEI（参謀エージェント）に kpi.json と minutes.json を読ませ、
判断トレース decisions.json を書かせる。画面は decisions.json があれば派生判断より優先して表示する。

流れ:
  1. hud/data/decision-board/kpi.json と minutes.json を読み、KANBEI に渡す要約テキストを作る
  2. claude --agent kanbei -p <要約＋指示> を読み取り専用の権限で実行する（送信・書き込みはしない）
  3. 返答から JSON を取り出し、型（DecisionTrace）に合わせて検証・補正して decisions.json に書く
  4. 失敗したら既存の decisions.json は触らず exit 1（画面は前回分か派生判断を出し続ける）

使い方:
  python hud/adapters/kanbei_decisions.py            # 実行
  python hud/adapters/kanbei_decisions.py --dry-run  # KANBEI に渡す文面を表示して終了（呼び出さない）
  python hud/adapters/kanbei_decisions.py --model sonnet --timeout 300
環境変数:
  JARVIS_AGENTS_CWD   .claude/agents がある場所（既定 C:\claude code）
  JARVIS_KANBEI_MODEL 既定 sonnet
  JARVIS_VISIONX_DIR  ボルト（--add-dir で読み取り許可。既定 C:\Users\tetsuya.tani\Box\obsidian）
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import date, datetime
from pathlib import Path

for _st in (sys.stdout, sys.stderr):
    try:
        _st.reconfigure(encoding="utf-8")
    except Exception:
        pass

HERE = Path(__file__).resolve().parent
DATA_DIR = HERE.parent / "data" / "decision-board"
KPI = DATA_DIR / "kpi.json"
MINUTES = DATA_DIR / "minutes.json"
OUT = DATA_DIR / "decisions.json"
RAW_OUT = DATA_DIR / "kanbei_last_response.txt"
AGENTS_CWD = Path(os.environ.get("JARVIS_AGENTS_CWD", r"C:\claude code"))
VISIONX_DIR = Path(os.environ.get("JARVIS_VISIONX_DIR", r"C:\Users\tetsuya.tani\Box\obsidian"))
MODEL = os.environ.get("JARVIS_KANBEI_MODEL", "sonnet")
ALLOWED_TOOLS = "Read,Glob,Grep"
DISALLOWED_TOOLS = ",".join([
    "Bash", "Edit", "Write", "NotebookEdit", "Agent", "WebFetch", "WebSearch",
    "mcp__claude_ai_Gmail__send_message", "mcp__claude_ai_Gmail__create_draft",
])
MAX_TRACES = 8
LEVELS = {"info", "warn", "alert"}


# ---------------------------------------------------------------- 入力の要約
def fmt(v, unit=""):
    if v is None:
        return "未取得"
    if unit == "%":
        return f"{v:.1f}%"
    return f"{v:,.0f}{unit}"


def pct(c, value=None):
    """差分率。kpi.json には実額しか無いので、実績と比較値から画面側と同じ式で計算する。"""
    if c.get("diffPct") is not None:
        return f"{c['diffPct']:+.1f}%"
    base = c.get("value")
    if value is None or not base:
        return "未取得"
    return f"{(value - base) / abs(base) * 100:+.1f}%"


def summarize_kpi(kpi: dict) -> str:
    comp = kpi.get("company", {}).get("name", "")
    sec = kpi.get("section", {})
    lines = [f"会社: {comp} / 断面: {sec.get('label', '')} {sec.get('range', '')} / 数字の生成 {kpi.get('generatedAt', '')[:16]}"]
    if kpi.get("insider"):
        lines.append("注意: 区分C（未公表数値）を含む。判断文に具体額を書かない")
    for w in kpi.get("warnings", []):
        lines.append(f"資料側の警告: {w}")
    lines.append("")
    lines.append("id | 指標 | 実績 | 計画 | 対計画 | 前期 | 対前期 | 注意閾値 | 備考")
    for m in kpi.get("metrics", []):
        plan = next((c for c in m.get("compare", []) if c["type"] == "plan"), {})
        prev = next((c for c in m.get("compare", []) if c["type"] == "prev"), {})
        note = m.get("period", "").split("。", 2)[-1] if "。" in m.get("period", "") else ""
        lines.append(" | ".join([
            m["id"], m["name"], fmt(m.get("value"), m.get("unit", "")),
            fmt(plan.get("value"), m.get("unit", "")), pct(plan, m.get("value")),
            fmt(prev.get("value"), m.get("unit", "")), pct(prev, m.get("value")),
            f"{m.get('warnPct', -10)}%", note[:80],
        ]))
    first = kpi.get("metrics", [{}])[0]
    lines.append("")
    lines.append(f"期間の意味: {first.get('period', '').split('。')[0]}（断面値のみ。月次推移は未取得）")
    lines.append(f"出典: {first.get('source', '')}")
    return "\n".join(lines)


def summarize_minutes(mn: dict) -> str:
    today = date.today().isoformat()
    lines = [f"議事録の生成 {mn.get('generatedAt', '')[:16]} / 直近 {mn.get('window', {}).get('days', '')} 日・{len(mn.get('minutes', []))} 会議", ""]
    for mt in mn.get("minutes", []):
        lines.append(f"[{mt['id']}] {mt['meeting']} {mt['datetime'][:10]}")
        for d in mt.get("decisions", []):
            lines.append(f"  決定: {d[:140]}")
        for h in mt.get("homework", []):
            if h.get("status") == "done":
                continue
            due = h.get("due")
            flag = ""
            if due and due < today:
                flag = f"（期限超過 {(date.fromisoformat(today) - date.fromisoformat(due)).days}日）"
            lines.append(f"  宿題[{h['id']}]: {h['title'][:120]} / 担当 {h.get('owner', '担当未取得')} / 期限 {due or '未設定'}{flag}")
        for o in mt.get("openIssues", []):
            lines.append(f"  未決: {o[:120]}")
        lines.append("")
    return "\n".join(lines)


PROMPT_HEAD = """あなたは KANBEI（参謀）として、VX 経営意思決定パネルに載せる「判断トレース」を書きます。
読み手は谷社長です。目的は、AIが「何を根拠に、どれくらいの確信で、何を判断したか」を一目で監査できるようにすることです。

守ること（絶対）
- 根拠は下の経営数字と議事録だけ。推測や一般論で埋めない。数字が未取得の項目は「判断保留」とする
- 1件ごとに、根拠にしたデータ（指標 id か議事録 id／宿題 id）と信頼度（0〜100）と信頼度の算出根拠を必ず書く
- 金額だけを書かない。必ず期間（断面）と比較対象（対計画／対前期）を併記する
- 季節型の拠点（備考に「季節構造」とあるもの）は上期の未達だけで「失速」と断じない。注意閾値が緩めてある理由を踏まえる
- 営業利益率などの率を自分で計算して断定しない。表にある値だけを使う
- 実行は「下書き」「提案」「確認事項に追記」までにとどめ、送信・投稿を実行したことにしない
- 件数は最大 8 件。重要度順（alert → warn → info）。同じ指標で拠点を分けるより、全社で 1 件にまとめて拠点差を signals に書く方がよい
- level の基準: alert＝今週中に社長の判断が要る／warn＝担当に確認や指示が要る／info＝把握しておけばよい
- 出力は JSON だけ。前後に説明文やコードフェンス（```）を付けない

出力形式（この JSON オブジェクトだけを返す）
{
  "traces": [
    {
      "id": "英数字とアンダースコアの一意キー",
      "level": "alert | warn | info",
      "purpose": "目的（何のための判断か。1文）",
      "signals": [ { "kind": "kpi | minutes", "ref": "指標 id または 議事録 id／宿題 id", "label": "人が読める根拠（値や期限を含む）" } ],
      "candidates": [ { "label": "候補", "score": 0-100, "note": "評価理由（1文）" } ],
      "decision": "判断（結論を先に。期間と比較対象を含める。2文以内）",
      "confidence": 0-100,
      "confidenceBasis": "信頼度の算出根拠（どのデータが揃っていて、何が欠けているか）",
      "executions": [ { "text": "実行ログ（下書き・提案・確認事項への追記など、実際に行ってよい範囲）" } ]
    }
  ]
}
"""


def build_prompt(kpi: dict, mn: dict) -> str:
    return (
        PROMPT_HEAD
        + f"\n今日: {date.today().isoformat()}\n\n"
        + "=== 経営数字（kpi.json の要約） ===\n" + summarize_kpi(kpi)
        + "\n\n=== 議事録（minutes.json の要約。完了済みの宿題は除外） ===\n" + summarize_minutes(mn)
    )


# ---------------------------------------------------------------- 呼び出し
def call_kanbei(prompt: str, model: str, timeout: int) -> str:
    exe = shutil.which("claude")
    if not exe:
        sys.exit("claude コマンドが見つかりません")
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
    env.setdefault("MAX_THINKING_TOKENS", "0")
    r = subprocess.run(
        [
            exe, "--agent", "kanbei", "-p", prompt,
            "--output-format", "text",
            "--model", model,
            "--allowedTools", ALLOWED_TOOLS,
            "--disallowedTools", DISALLOWED_TOOLS,
            "--add-dir", str(VISIONX_DIR),
            "--max-turns", "3",
        ],
        cwd=str(AGENTS_CWD), env=env, stdin=subprocess.DEVNULL,
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout,
    )
    text = (r.stdout or "").strip()
    RAW_OUT.write_text(text or (r.stderr or ""), encoding="utf-8")
    if "Not logged in" in text or "Not logged in" in (r.stderr or ""):
        sys.exit("claude CLI がログアウト状態です。ターミナルで `claude login` を実行してから再実行してください")
    if r.returncode != 0 or not text:
        sys.exit(f"claude が失敗しました rc={r.returncode}: {(r.stderr or text)[:400]}")
    return text


# ---------------------------------------------------------------- 検証
def extract_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.M)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("返答に JSON オブジェクトが見つかりません")
    return json.loads(text[start:end + 1])


def clamp(v, lo=0, hi=100, default=0):
    try:
        return max(lo, min(hi, int(round(float(v)))))
    except (TypeError, ValueError):
        return default


def validate(traces: list, kpi: dict, mn: dict) -> tuple[list, list[str]]:
    kpi_ids = {m["id"] for m in kpi.get("metrics", [])}
    mt_ids = {mt["id"] for mt in mn.get("minutes", [])}
    hw_ids = {h["id"] for mt in mn.get("minutes", []) for h in mt.get("homework", [])}
    now = datetime.now().isoformat(timespec="seconds")
    out, warns = [], []
    seen = set()
    for i, t in enumerate(traces[:MAX_TRACES], 1):
        if not isinstance(t, dict):
            warns.append(f"{i}件目: オブジェクトでない"); continue
        tid = re.sub(r"[^A-Za-z0-9_]", "_", str(t.get("id") or f"kanbei_{i}"))
        if not tid.startswith("kanbei_"):
            tid = "kanbei_" + tid
        if tid in seen:
            tid = f"{tid}_{i}"
        seen.add(tid)
        signals = []
        for s in t.get("signals", []) or []:
            kind = s.get("kind") if s.get("kind") in ("kpi", "minutes") else ("kpi" if s.get("ref") in kpi_ids else "minutes")
            ref = str(s.get("ref", ""))
            if ref and ref not in kpi_ids | mt_ids | hw_ids:
                warns.append(f"{tid}: 根拠 ref '{ref}' が入力に無い（ラベルは残す）")
            signals.append({"kind": kind, "ref": ref, "label": str(s.get("label", ref))[:160]})
        if not signals:
            warns.append(f"{tid}: 根拠なしのため除外"); continue
        cands = [{"label": str(c.get("label", ""))[:60], "score": clamp(c.get("score")), "note": str(c.get("note", ""))[:120]}
                 for c in (t.get("candidates") or []) if isinstance(c, dict)]
        if not cands:
            cands = [{"label": "判断保留", "score": 50, "note": "候補の評価が返らなかった"}]
        level = t.get("level") if t.get("level") in LEVELS else "info"
        out.append({
            "id": tid, "ts": now, "level": level, "source": "kanbei",
            "purpose": str(t.get("purpose", ""))[:120],
            "signals": signals,
            "candidates": cands,
            "decision": str(t.get("decision", ""))[:400],
            "confidence": clamp(t.get("confidence"), default=50),
            "confidenceBasis": str(t.get("confidenceBasis", ""))[:300] or "算出根拠の記載なし",
            "executions": [{"ts": now, "text": str(e.get("text", e) if isinstance(e, dict) else e)[:160]}
                           for e in (t.get("executions") or [])] or [{"ts": now, "text": "実行なし（把握のみ）"}],
        })
    order = {"alert": 0, "warn": 1, "info": 2}
    out.sort(key=lambda x: order[x["level"]])
    return out, warns


# ---------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--from-file", default=None, help="claude を呼ばず、このファイルの返答テキストを検証して decisions.json にする（デスクトップセッションで代行した時用）")
    ap.add_argument("--model-label", default=None, help="--from-file 時に記録するモデル名")
    ap.add_argument("--model", default=MODEL)
    ap.add_argument("--timeout", type=int, default=300)
    ap.add_argument("--out", default=str(OUT))
    a = ap.parse_args()

    for p in (KPI, MINUTES):
        if not p.exists():
            sys.exit(f"入力がありません: {p}（先に keiei_kpi_adapter.py / minutes_adapter.py を実行）")
    kpi = json.loads(KPI.read_text(encoding="utf-8"))
    mn = json.loads(MINUTES.read_text(encoding="utf-8"))
    if kpi.get("isDummy") or mn.get("isDummy"):
        sys.exit("入力がダミーのため KANBEI には渡しません")
    prompt = build_prompt(kpi, mn)
    if a.dry_run:
        print(prompt)
        print(f"\n[dry-run] 文字数 {len(prompt)}")
        return

    t0 = time.perf_counter()
    print(f"KANBEI 呼び出し: model={a.model} 入力 {len(prompt)} 文字", flush=True)
    if a.from_file:
        text = Path(a.from_file).read_text(encoding="utf-8")
        print(f"返答ファイルから生成: {a.from_file}")
    else:
        text = call_kanbei(prompt, a.model, a.timeout)
    try:
        obj = extract_json(text)
    except (ValueError, json.JSONDecodeError) as e:
        sys.exit(f"JSON の取り出しに失敗: {e}（生の返答は {RAW_OUT}）")
    traces, warns = validate(obj.get("traces", []), kpi, mn)
    if not traces:
        sys.exit("有効な判断が 0 件のため decisions.json は更新しません")
    payload = {
        "isDummy": False,
        "source": "kanbei",
        "model": a.model_label or ("desktop-session" if a.from_file else a.model),
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "inputs": {"kpiGeneratedAt": kpi.get("generatedAt"), "minutesGeneratedAt": mn.get("generatedAt")},
        "elapsedSec": round(time.perf_counter() - t0, 1),
        "warnings": warns,
        "traces": traces,
    }
    out_path = Path(a.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    lv = {k: sum(1 for t in traces if t["level"] == k) for k in ("alert", "warn", "info")}
    print(f"decisions.json 出力: {out_path}（{payload['elapsedSec']} 秒）")
    print(f"  判断 {len(traces)}件: 要判断 {lv['alert']} / 注意 {lv['warn']} / 情報 {lv['info']}")
    for t in traces:
        print(f"  - [{t['level']}] {t['purpose']} → 信頼度 {t['confidence']}%（根拠 {len(t['signals'])}件）")
    for w in warns:
        print(f"  注意: {w}")


if __name__ == "__main__":
    main()
