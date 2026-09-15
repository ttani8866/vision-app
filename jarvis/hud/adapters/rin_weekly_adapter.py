r"""
経営ダッシュボード用アダプター: RIN週次財務レポート（VisionX）→ hud/data/dashboard.json

このアダプターが唯一のデータ源。存在しない値は捏造せず null + note("未取得") で出力する。
後から Obsidian Local REST API・Google Calendar 等の別ソースを足す場合は、
この adapters/ にファイルを追加し、同じ出力スキーマ（rows/metrics/value/note）を守ればよい。
hud/config/metrics.json（指標・切り口の定義）とコードは分離してあるので、
行・指標を増やす場合はまず metrics.json を編集し、本ファイルの抽出ロジックを対応させる。

使い方:
  python hud/adapters/rin_weekly_adapter.py            # hud/data/dashboard.json を出力
環境変数:
  JARVIS_VISIONX_DIR  ボルトのパス（既定: C:\Users\tetsuya.tani\Box\obsidian）
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

for _st in (sys.stdout, sys.stderr):
    try:
        _st.reconfigure(encoding="utf-8")
    except Exception:
        pass

VAULT = Path(os.environ.get("JARVIS_VISIONX_DIR", r"C:\Users\tetsuya.tani\Box\obsidian"))
WEEKLY_DIR = VAULT / "04_claude" / "finance" / "weekly"
OUT = Path(__file__).resolve().parent.parent / "data" / "dashboard.json"

# フェーズC最小版の固定行・固定指標。増やす場合は hud/config/metrics.json と揃える。
BRANCH_ROWS = ["名古屋本社", "東京本社", "新東大阪", "統括本部"]
METRIC_COLUMNS = {
    # 出力側metric id: (レポート表の列名, 単位)
    "sales": ("売上", "千円"),
    "gross_profit": ("粗利", "千円"),
}
# 対目標・対前期は現状のレポート形式では売上列にしかない（絶対原則5: ないものはないと書く）
RATIO_COLUMNS = {
    "vs_target_pct": "対目標(売上)",
    "vs_prev_year_pct": "対前期(売上)",
}


def find_latest_report() -> Path | None:
    if not WEEKLY_DIR.exists():
        return None
    reports = sorted(WEEKLY_DIR.glob("*_週次財務レポート_RIN.md"))
    return reports[-1] if reports else None


def parse_markdown_table(table_text: str) -> dict[str, dict[str, str]]:
    """先頭列（区分）をキーにした行の辞書を返す。"""
    lines = [ln for ln in table_text.splitlines() if ln.strip().startswith("|")]
    if len(lines) < 3:
        return {}
    header = [c.strip() for c in lines[0].strip().strip("|").split("|")]
    rows: dict[str, dict[str, str]] = {}
    for ln in lines[2:]:  # 1行目=ヘッダ、2行目=区切り線
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if len(cells) != len(header):
            continue
        row = dict(zip(header, cells))
        name = row.get("区分", "")
        if name:
            rows[name] = row
    return rows


def extract_shinto_branch_table(text: str) -> tuple[str | None, str | None, dict[str, dict[str, str]]]:
    """
    本文中の「新東通信（出典：...）」ブロックから、出典・断面の説明・拠点別テーブルを取り出す。
    見つからない場合は (None, None, {}) を返す（呼び出し側で全行 未取得 にする）。
    """
    marker = "新東通信（出典："
    idx = text.find(marker)
    if idx == -1:
        return None, None, {}

    line_end = text.find("\n", idx)
    if line_end == -1:
        return None, None, {}
    source_line = text[idx:line_end]
    m = re.search(r"出典：([^）]+)）", source_line)
    source = m.group(1).strip() if m else None

    rest = text[line_end + 1:]
    table_idx = rest.find("| 区分")
    if table_idx == -1:
        return source, None, {}
    period_note = rest[:table_idx].strip()

    # テーブルは "|" で始まる行が続く間だけを対象にする
    table_lines: list[str] = []
    for ln in rest[table_idx:].splitlines():
        if ln.strip().startswith("|"):
            table_lines.append(ln)
        elif table_lines:
            break
    rows = parse_markdown_table("\n".join(table_lines))
    return source, period_note, rows


def to_number(raw: str) -> float | int | None:
    if raw is None:
        return None
    s = raw.strip().replace(",", "").replace("△", "-")
    if s in ("", "-", "―", "—"):
        return None
    try:
        return int(s)
    except ValueError:
        try:
            return float(s)
        except ValueError:
            return None


def to_pct(raw: str) -> float | None:
    if raw is None:
        return None
    s = raw.strip().replace("%", "").replace("△", "-")
    if s in ("", "-", "―", "—"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def build() -> dict:
    report_path = find_latest_report()
    generated_at = datetime.now().isoformat(timespec="seconds")

    if report_path is None:
        return {
            "generated_at": generated_at,
            "source_report": None,
            "cut": "branch",
            "rows": [
                {
                    "name": name,
                    "metrics": {
                        mid: {"value": None, "unit": unit, "vs_target_pct": None,
                              "vs_prev_year_pct": None, "period": None, "source": None,
                              "note": "未取得（RIN週次レポートが見つかりません）"}
                        for mid, (_, unit) in METRIC_COLUMNS.items()
                    },
                }
                for name in BRANCH_ROWS
            ],
            "note": f"週次レポートフォルダに *_週次財務レポート_RIN.md が見つかりません（{WEEKLY_DIR}）",
        }

    text = report_path.read_text(encoding="utf-8")
    source, period_note, table_rows = extract_shinto_branch_table(text)

    rows = []
    for name in BRANCH_ROWS:
        raw_row = table_rows.get(name)
        if raw_row is None:
            rows.append({
                "name": name,
                "metrics": {
                    mid: {"value": None, "unit": unit, "vs_target_pct": None,
                          "vs_prev_year_pct": None, "period": period_note, "source": source,
                          "note": "未取得（本レポートに該当行なし）"}
                    for mid, (_, unit) in METRIC_COLUMNS.items()
                },
            })
            continue

        metrics = {}
        for mid, (col, unit) in METRIC_COLUMNS.items():
            value = to_number(raw_row.get(col, ""))
            entry = {
                "value": value,
                "unit": unit,
                "period": period_note,
                "source": source,
            }
            if col == "売上":
                entry["vs_target_pct"] = to_pct(raw_row.get(RATIO_COLUMNS["vs_target_pct"], ""))
                entry["vs_prev_year_pct"] = to_pct(raw_row.get(RATIO_COLUMNS["vs_prev_year_pct"], ""))
            else:
                # このレポート形式では粗利益の対目標・対前期は列自体が存在しない
                entry["vs_target_pct"] = None
                entry["vs_prev_year_pct"] = None
                entry["note"] = "対目標・対前期は本レポートに粗利益列の記載なし（未取得）"
            if value is None and "note" not in entry:
                entry["note"] = "未取得（値を読み取れません）"
            metrics[mid] = entry
        rows.append({"name": name, "metrics": metrics})

    return {
        "generated_at": generated_at,
        "source_report": {
            "path": str(report_path.relative_to(VAULT)).replace("\\", "/"),
            "file": report_path.name,
        },
        "cut": "branch",
        "rows": rows,
        "note": None if table_rows else "新東通信の拠点別テーブルを検出できませんでした（レポート形式が変わった可能性）",
    }


def main() -> int:
    data = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"出典: {data.get('source_report')}")
    for row in data["rows"]:
        for mid, m in row["metrics"].items():
            v = m["value"]
            flag = "" if v is not None else f"  [{m.get('note', '未取得')}]"
            print(f"  {row['name']:8s} {mid:14s} {v}{flag}")
    print(f"出力: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
