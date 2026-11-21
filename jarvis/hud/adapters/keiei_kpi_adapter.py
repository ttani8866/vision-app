r"""
判断監査ボード用アダプター（経営数字）: keiei-dashboard の data.json → hud/data/decision-board/kpi.json

データ源は C:\claude code\keiei-dashboard\build_data.py が生成する data.json（3社の役員会資料を
正規化済み。出典・断面・セルフチェック付き）。このアダプターは変換だけを行い、数字の解釈や
補完はしない。資料に無い値は null のまま出し、画面側が「未取得」と表示する。

使い方:
  python hud/adapters/keiei_kpi_adapter.py                      # 新東通信・既定断面
  python hud/adapters/keiei_kpi_adapter.py --company shinto --section h1
  python hud/adapters/keiei_kpi_adapter.py --rebuild            # 先に build_data.py を走らせる
  python hud/adapters/keiei_kpi_adapter.py --list               # 会社・断面・カードの一覧

環境変数:
  KEIEI_DASHBOARD_DIR  keiei-dashboard のフォルダ（既定: C:\claude code\keiei-dashboard）

注意:
  共同ピーアール（kpr）は未公表数値（区分C・インサイダー情報）を含む。kpi.json に insider: true を
  書き出し、画面側が警告バッジを常時表示する。社外に出す画面には使わない。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

for _st in (sys.stdout, sys.stderr):
    try:
        _st.reconfigure(encoding="utf-8")
    except Exception:
        pass

DASH_DIR = Path(os.environ.get("KEIEI_DASHBOARD_DIR", r"C:\claude code\keiei-dashboard"))
DATA_JSON = DASH_DIR / "data.json"
OUT = Path(__file__).resolve().parent.parent / "data" / "decision-board" / "kpi.json"

# 画面に出すカードと指標。group は画面左のグルーピング名。
# card.group（company/main/ref）→ 画面グループ名。ref（参考欄）は既定で出さない。
GROUP_LABEL = {"company": "全社", "main": "拠点別"}
# 指標名 → 出力 id の接尾辞。ここに無い指標は出さない（粗利率・販管費は全社のみ）。
ITEM_IDS = {
    "売上": "sales",
    "純売上（ネット）": "sales",
    "売上高（ネット）": "sales",
    "粗利": "gross_profit",
    "売上総利益（粗利）": "gross_profit",
    "粗利率": "gross_margin",
    "粗利率（純売上ベース）": "gross_margin",
    "販管費": "sga",
    "営業利益": "op_profit",
    "経常利益": "ordinary_profit",
}
COMPANY_ONLY_ITEMS = {"gross_margin", "sga", "ordinary_profit"}
# 異常判定の閾値（対計画差分率 %）。季節型の拠点はカード note に従い緩める。
DEFAULT_WARN_PCT = -10
SEASONAL_WARN_PCT = -25  # 「季節構造」と注記されたカードに適用


def load_data(rebuild: bool) -> dict:
    if rebuild:
        print(f"build_data.py を実行: {DASH_DIR}")
        r = subprocess.run([sys.executable, str(DASH_DIR / "build_data.py")], cwd=str(DASH_DIR))
        if r.returncode != 0:
            sys.exit(f"build_data.py が失敗しました（exit {r.returncode}）")
    if not DATA_JSON.exists():
        sys.exit(f"data.json がありません: {DATA_JSON}（--rebuild で生成できます）")
    return json.loads(DATA_JSON.read_text(encoding="utf-8"))


def to_iso(ts: str | None) -> str:
    """'2026-10-29 16:40' → ISO。形式が違えばそのまま返す。"""
    if not ts:
        return ""
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(ts, fmt).isoformat()
        except ValueError:
            continue
    return ts


def convert(company: dict, section_key: str) -> dict:
    sec = company["sections"][section_key]
    if not sec.get("available", True):
        sys.exit(f"断面 {section_key} は資料に無い（available=false）")
    src = company["source"]
    fiscal = company.get("fiscal", {})
    unit = company.get("unit", "千円")
    updated = to_iso(src.get("timestamp"))
    period_base = f"{fiscal.get('label', '')} {sec['label']}（{sec['range']}）".strip()
    actual_label = sec.get("actual_label") or src.get("actual_label") or "実績"
    cut = sec.get("cut_label", "")

    metrics = []
    for card in sec["cards"]:
        grp = GROUP_LABEL.get(card["group"])
        if not grp:
            continue  # 参考欄（統括本部・拠点合計・事業本部内数・分離管理）は出さない
        seasonal = "季節" in (card.get("note") or "")
        for it in card["items"]:
            mid = ITEM_IDS.get(it["name"])
            if not mid:
                continue
            if card["group"] != "company" and mid in COMPANY_ONLY_ITEMS:
                continue
            is_rate = it["kind"] == "rate"
            scale = 100 if is_rate else 1
            val = None if it["actual"] is None else it["actual"] * scale
            compare = []
            if it.get("target") is not None or it.get("diff_t") is not None:
                compare.append({"type": "plan", "label": "計画",
                                "value": None if it.get("target") is None else it["target"] * scale})
            if it.get("prev") is not None or it.get("diff_p") is not None:
                compare.append({"type": "prev", "label": "前期",
                                "value": None if it.get("prev") is None else it["prev"] * scale})
            notes = [n for n in (card.get("note"), it.get("note")) if n]
            if it.get("derived"):
                notes.append("算出値: " + "・".join(it["derived"]))
            name = it["name"] if card["group"] == "company" else f"{card['title']} {it['name']}"
            metrics.append({
                "id": f"{company['id']}_{card['id']}_{mid}",
                "name": name,
                "group": grp,
                "value": val,
                "unit": "%" if is_rate else unit,
                "period": f"{period_base} {actual_label}。断面 {cut}" + (f"。{'；'.join(notes)}" if notes else ""),
                "compare": compare,
                "history": [],  # 資料は断面値のみで月次推移が無い（未取得）
                "source": f"{src.get('name', '')}" + (f" {src['page_id']}" if src.get("page_id") else ""),
                "updatedAt": updated,
                "warnPct": SEASONAL_WARN_PCT if seasonal else DEFAULT_WARN_PCT,
            })
    return {
        "isDummy": False,
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "company": {"id": company["id"], "name": company["name"]},
        "insider": bool(company.get("insider")),
        "section": {"key": section_key, "label": sec["label"], "range": sec["range"]},
        "warnings": company.get("warnings", []),
        "sourceGeneratedAt": None,
        "metrics": metrics,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--company", default="shinto", help="shinto / kpr / vaz（既定 shinto）")
    ap.add_argument("--section", default=None, help="断面キー（既定: 会社の default_section）")
    ap.add_argument("--rebuild", action="store_true", help="先に keiei-dashboard/build_data.py を実行する")
    ap.add_argument("--list", action="store_true", help="会社・断面・カードを一覧して終了")
    ap.add_argument("--out", default=str(OUT))
    a = ap.parse_args()

    data = load_data(a.rebuild)
    companies = {c["id"]: c for c in data["companies"]}
    if a.list:
        for c in data["companies"]:
            print(f"{c['id']}: {c['name']} 既定断面={c['default_section']} 断面={c['section_order']} insider={c.get('insider')}")
            for k, s in c["sections"].items():
                print(f"  {k}: {s['label']} {s['range']} available={s.get('available', True)} cards={[x['title'] for x in s['cards']]}")
        return
    if a.company not in companies:
        sys.exit(f"会社 {a.company} は data.json にありません: {list(companies)}")
    company = companies[a.company]
    section = a.section or company["default_section"]
    if section not in company["sections"]:
        sys.exit(f"断面 {section} はありません: {list(company['sections'])}")

    out = convert(company, section)
    out["sourceGeneratedAt"] = to_iso(data.get("generated_at"))
    out_path = Path(a.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    na = sum(1 for m in out["metrics"] if m["value"] is None)
    print(f"kpi.json 出力: {out_path}")
    print(f"  会社 {company['name']} / 断面 {out['section']['label']} {out['section']['range']} / 指標 {len(out['metrics'])}件（未取得 {na}件）")
    print(f"  出典 {company['source'].get('name')} / 資料日時 {company['source'].get('timestamp')} / data.json 生成 {data.get('generated_at')}")
    if out["insider"]:
        print("  警告: 区分C（インサイダー情報）を含む。社外に出さない")
    for w in out["warnings"]:
        print(f"  資料側の警告: {w}")


if __name__ == "__main__":
    main()
