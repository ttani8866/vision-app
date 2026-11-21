r"""
判断監査ボード用アダプター（議事録）: VisionX の議事録 md → hud/data/decision-board/minutes.json

データ源は gdrive-mtg-sync が同期・md変換した会社別の議事録フォルダ
（既定: 51_新東通信\s議事録）。見出しを手がかりに「決定事項」「宿題（担当・期限）」「未決事項」を
抜き出す。見出しに該当が無いファイルは載せない（本文から推測して作らない）。

見出しの判定（大文字小文字・全角半角は無視）:
  決定事項: 決定 / 決議 / Decisions / Decision
  宿題    : アクションアイテム / Action Items / 宿題 / TODO / ToDo / タスク
  未決    : Open Questions / 未決 / 検討事項 / 課題（「〜の課題」も含む）
  「## 【決定】〜」のような見出し自体が決定事項のものは、その見出し文を決定事項として採る。

会議日付の優先順: frontmatter meeting_date → 本文「日付: 2026年11月19日」→
  ファイル名の先頭 YYYYMMDD / YYMMDD / MMDD → 本文の最初の「YYYY年M月D日」→ ファイル更新日。

使い方:
  python hud/adapters/minutes_adapter.py                 # 直近60日・最大8会議
  python hud/adapters/minutes_adapter.py --days 90 --max 12
  python hud/adapters/minutes_adapter.py --dir "C:\...\52_共同ピーアール\k議事録＆MTGアジェンダ" --company 共同ピーアール
環境変数:
  JARVIS_VISIONX_DIR  ボルトのパス（既定: C:\Users\tetsuya.tani\Box\obsidian）
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.parse import quote

for _st in (sys.stdout, sys.stderr):
    try:
        _st.reconfigure(encoding="utf-8")
    except Exception:
        pass

VAULT = Path(os.environ.get("JARVIS_VISIONX_DIR", r"C:\Users\tetsuya.tani\Box\obsidian"))
VAULT_NAME = "obsidian"  # obsidian:// リンク用のボルト名
DEFAULT_DIR = VAULT / "51_新東通信" / "s議事録"
OUT = Path(__file__).resolve().parent.parent / "data" / "decision-board" / "minutes.json"

HEAD_RE = re.compile(r"^(#{1,4})\s+(.+?)\s*$")
BULLET_RE = re.compile(r"^(\s*)[-*・]\s*(?:\[([ xX])\]\s*)?(.+?)\s*$")
KIND_PATTERNS = {
    "decisions": re.compile(r"決定|決議|decisions?\b", re.I),
    "homework": re.compile(r"アクションアイテム|action\s*items?|宿題|todo|タスク", re.I),
    "open": re.compile(r"open\s*questions?|未決|検討事項|課題", re.I),
}
DECISION_HEAD_RE = re.compile(r"^[【\[]\s*決定\s*[】\]]\s*(.+)$")
NOISE_RE = re.compile(r"\((?:owner|due) not stated\)|（担当未定）", re.I)


def norm(s: str) -> str:
    return unicodedata.normalize("NFKC", s)


# ---------------------------------------------------------------- 日付
def parse_date_text(s: str, base: date | None = None) -> date | None:
    s = norm(s)
    m = re.search(r"(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})", s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    m = re.search(r"(?<!\d)(\d{1,2})月(\d{1,2})日", s)
    if m and base:
        mo, d = int(m.group(1)), int(m.group(2))
        y = base.year + (1 if mo < base.month else 0)  # 会議月より前の月なら翌年
        try:
            return date(y, mo, d)
        except ValueError:
            return None
    m = re.search(r"(?<!\d)(\d{1,2})/(\d{1,2})(?!\d)", s)
    if m and base:
        mo, d = int(m.group(1)), int(m.group(2))
        y = base.year + (1 if mo < base.month else 0)
        try:
            return date(y, mo, d)
        except ValueError:
            return None
    return None


def meeting_date_of(path: Path, text: str) -> tuple[date, str]:
    m = re.search(r"^meeting_date:\s*(\S+)", text, re.M)
    if m and (d := parse_date_text(m.group(1))):
        return d, "frontmatter"
    m = re.search(r"^日付[:：]\s*(.+)$", text, re.M)
    if m and (d := parse_date_text(m.group(1))):
        return d, "本文の日付行"
    stem = norm(path.stem)
    m = re.match(r"(20\d{2})(\d{2})(\d{2})", stem)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3))), "ファイル名"
        except ValueError:
            pass
    m = re.match(r"(\d{2})(\d{2})(\d{2})[_ ]", stem)
    if m:
        try:
            return date(2000 + int(m.group(1)), int(m.group(2)), int(m.group(3))), "ファイル名"
        except ValueError:
            pass
    mtime = datetime.fromtimestamp(path.stat().st_mtime).date()
    m = re.match(r"(\d{2})(\d{2})[_ ]", stem)
    if m:
        try:
            return date(mtime.year, int(m.group(1)), int(m.group(2))), "ファイル名（年は更新日で補完）"
        except ValueError:
            pass
    body = re.sub(r"^---.*?---", "", text, count=1, flags=re.S)
    if d := parse_date_text(body[:2000]):
        return d, "本文の最初の日付"
    return mtime, "ファイル更新日"


# ---------------------------------------------------------------- 本文解析
def strip_frontmatter(text: str) -> tuple[dict, str]:
    fm: dict = {}
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            for ln in text[3:end].splitlines():
                if ":" in ln:
                    k, v = ln.split(":", 1)
                    fm[k.strip()] = v.strip()
            text = text[end + 4:]
    return fm, text


def sections(text: str):
    """(kind, heading, lines) を順に返す。kind は decisions/homework/open/None。"""
    cur_kind, cur_head, cur_level, buf = None, "", 0, []
    for ln in text.splitlines():
        m = HEAD_RE.match(ln)
        if m:
            if cur_kind:
                yield cur_kind, cur_head, buf
            level, head = len(m.group(1)), m.group(2).strip()
            kind = None
            for k, pat in KIND_PATTERNS.items():
                if pat.search(norm(head)):
                    kind = k
                    break
            if kind == "open" and KIND_PATTERNS["decisions"].search(norm(head)):
                kind = "decisions"
            cur_kind, cur_head, cur_level, buf = kind, head, level, []
        else:
            buf.append(ln)
    if cur_kind:
        yield cur_kind, cur_head, buf


def top_bullets(lines: list[str]) -> list[tuple[str, bool | None, list[str]]]:
    """最上位の箇条書きと、その直下の補足（インデント付き）を返す。"""
    items: list[tuple[str, bool | None, list[str]]] = []
    base_indent = None
    for ln in lines:
        m = BULLET_RE.match(ln)
        if not m:
            continue
        indent = len(m.group(1).replace("\t", "    "))
        done = None if m.group(2) is None else m.group(2).strip().lower() == "x"
        txt = NOISE_RE.sub("", m.group(3)).strip()
        if not txt:
            continue
        if base_indent is None or indent <= base_indent:
            base_indent = indent if base_indent is None else min(base_indent, indent)
            items.append((txt, done, []))
        elif items:
            items[-1][2].append(txt)
    return items


OWNER_RE = re.compile(r"^([^\s:：]{1,12}(?:[（(][^）)]{1,12}[）)])?)\s*[:：]\s*(.+)$")


def parse_homework(txt: str, done: bool | None, base: date, idx: str) -> dict:
    owner = "担当未取得"
    m = OWNER_RE.match(txt)
    if m and not re.search(r"https?", m.group(1)):
        owner, txt = m.group(1), m.group(2)
    due = parse_date_text(txt, base)
    # 「今週中」「来週」など相対表現は期限を作らない（推測しない）
    return {
        "id": idx,
        "title": txt,
        "owner": owner,
        "due": due.isoformat() if due else None,
        "status": "done" if done else "open",
    }


def parse_file(path: Path, company: str, rel_dir: str) -> tuple[dict | None, str]:
    text = path.read_text(encoding="utf-8", errors="replace")
    fm, body = strip_frontmatter(text)
    if re.search(r"^Notionページ:", body, re.M) and len(body.strip()) < 600:
        return None, "Notion参照のみのスタブ"
    mdate, date_src = meeting_date_of(path, text)
    decisions: list[str] = []
    homework: list[dict] = []
    open_issues: list[str] = []
    n = 0
    for kind, head, lines in sections(body):
        if kind == "decisions":
            dm = DECISION_HEAD_RE.match(norm(head))
            if dm:
                decisions.append(dm.group(1).strip())
            for txt, done, subs in top_bullets(lines):
                decisions.append(txt + (f"（{subs[0]}）" if subs else ""))
        elif kind == "homework":
            for txt, done, subs in top_bullets(lines):
                n += 1
                homework.append(parse_homework(txt, done, mdate, f"{path.stem[:20]}#{n}"))
        elif kind == "open":
            for txt, done, subs in top_bullets(lines):
                open_issues.append(txt)
    if not (decisions or homework or open_issues):
        return None, "決定・宿題・未決の見出しなし"
    title = re.sub(r"^\d{4,8}[_ ]", "", path.stem)
    title = re.sub(r"\.md$", "", title)
    title = re.sub(r"_v\d+(\.\d+)?$", "", title)
    title = re.sub(r"^議事録_", "", title)
    link = f"obsidian://open?vault={quote(VAULT_NAME)}&file={quote(rel_dir + '/' + path.stem)}"
    return {
        "id": path.stem,
        "meeting": title,
        "datetime": datetime(mdate.year, mdate.month, mdate.day, 9, 0).isoformat(),
        "dateSource": date_src,
        "company": fm.get("company", company),
        "classification": fm.get("class"),
        "decisions": decisions,
        "homework": homework,
        "openIssues": open_issues,
        "link": link,
    }, "ok"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=str(DEFAULT_DIR), help="議事録 md のフォルダ")
    ap.add_argument("--company", default="新東通信")
    ap.add_argument("--days", type=int, default=60, help="会議日がこの日数以内のものだけ（既定 60）")
    ap.add_argument("--max", type=int, default=8, help="新しい順に最大件数（既定 8）")
    ap.add_argument("--out", default=str(OUT))
    a = ap.parse_args()

    src_dir = Path(a.dir)
    if not src_dir.exists():
        sys.exit(f"フォルダがありません: {src_dir}")
    try:
        rel_dir = src_dir.resolve().relative_to(VAULT.resolve()).as_posix()
    except ValueError:
        rel_dir = src_dir.name
    cutoff = date.today() - timedelta(days=a.days)

    parsed, skipped = [], []
    for p in sorted(src_dir.glob("*.md")):
        rec, why = parse_file(p, a.company, rel_dir)
        if rec is None:
            skipped.append((p.name, why))
            continue
        if date.fromisoformat(rec["datetime"][:10]) < cutoff:
            skipped.append((p.name, f"{a.days}日より前"))
            continue
        parsed.append(rec)
    parsed.sort(key=lambda r: r["datetime"], reverse=True)
    parsed = parsed[: a.max]

    out = {
        "isDummy": False,
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "sourceDir": str(src_dir),
        "window": {"days": a.days, "max": a.max},
        "minutes": parsed,
    }
    out_path = Path(a.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    hw = sum(len(r["homework"]) for r in parsed)
    od = sum(1 for r in parsed for h in r["homework"] if h["status"] == "open" and h["due"] and h["due"] < date.today().isoformat())
    print(f"minutes.json 出力: {out_path}")
    print(f"  会議 {len(parsed)}件 / 決定 {sum(len(r['decisions']) for r in parsed)}件 / 宿題 {hw}件（期限超過 {od}件）/ 未決 {sum(len(r['openIssues']) for r in parsed)}件")
    for r in parsed:
        print(f"  - {r['datetime'][:10]} {r['meeting']}  決定{len(r['decisions'])} 宿題{len(r['homework'])} 未決{len(r['openIssues'])}  日付源: {r['dateSource']}")
    reasons: dict[str, int] = {}
    for _, why in skipped:
        reasons[why] = reasons.get(why, 0) + 1
    print(f"  対象外 {len(skipped)}件: " + ", ".join(f"{k} {v}" for k, v in sorted(reasons.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
