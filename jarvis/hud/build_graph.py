r"""
フェーズC 先行検証: VisionX（Obsidianボルト）のリンク構造を直接解析し、d3.js 用の graph.json を出力する。

Obsidian Local REST API プラグインは使わない。VisionX はローカルの .md ファイルなので、
[[wikilink]] を直接パースすれば同じノード・リンク構造が得られる（プラグイン導入不要・認証不要）。

使い方:
  python hud/build_graph.py                 # hud/graph.json を出力
  python hud/build_graph.py --top 20        # 被リンク数上位20ノードを表示
環境変数:
  JARVIS_VISIONX_DIR  ボルトのパス（既定: C:\Users\tetsuya.tani\Box\obsidian）
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

for _st in (sys.stdout, sys.stderr):
    try:
        _st.reconfigure(encoding="utf-8")
    except Exception:
        pass

VAULT = Path(os.environ.get("JARVIS_VISIONX_DIR", r"C:\Users\tetsuya.tani\Box\obsidian"))
OUT = Path(__file__).resolve().parent / "graph.json"
EXCLUDE_DIRS = {".git", ".obsidian", ".trash", "node_modules", "__pycache__"}
WIKILINK = re.compile(r"\[\[([^\]\|#]+)(?:#[^\]\|]*)?(?:\|[^\]]*)?\]\]")


def collect_notes() -> dict[str, Path]:
    """ノート名（拡張子なし）→ パス。同名が複数ある場合は最初のものを採用。"""
    notes: dict[str, Path] = {}
    for p in VAULT.rglob("*.md"):
        if any(part in EXCLUDE_DIRS for part in p.parts):
            continue
        notes.setdefault(p.stem, p)
    return notes


def build() -> dict:
    notes = collect_notes()
    links: set[tuple[str, str]] = set()
    unresolved = Counter()
    for name, path in notes.items():
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for m in WIKILINK.finditer(text):
            target = m.group(1).strip()
            target = Path(target).name  # フォルダ付きリンクは末尾のノート名で解決
            if target in notes and target != name:
                links.add((name, target))
            else:
                unresolved[target] += 1

    indeg = Counter(t for _, t in links)
    outdeg = Counter(s for s, _ in links)
    nodes = []
    for name, path in notes.items():
        rel = path.relative_to(VAULT)
        group = rel.parts[0] if len(rel.parts) > 1 else "(root)"
        nodes.append({
            "id": name,
            "group": group,
            "path": str(rel).replace("\\", "/"),
            "in": indeg[name],
            "out": outdeg[name],
        })
    return {
        "nodes": nodes,
        "links": [{"source": s, "target": t} for s, t in sorted(links)],
        "meta": {
            "vault": str(VAULT),
            "notes": len(notes),
            "links": len(links),
            "unresolved_links": sum(unresolved.values()),
            "groups": dict(Counter(n["group"] for n in nodes).most_common()),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=10)
    args = ap.parse_args()
    g = build()
    OUT.write_text(json.dumps(g, ensure_ascii=False), encoding="utf-8")
    m = g["meta"]
    print(f"ノート {m['notes']} / リンク {m['links']} / 未解決リンク {m['unresolved_links']}")
    print(f"出力: {OUT} ({OUT.stat().st_size // 1024} KB)")
    print("\nフォルダ別ノート数:")
    for k, v in list(m["groups"].items())[:12]:
        print(f"  {v:5d}  {k}")
    print(f"\n被リンク数 上位{args.top}:")
    for n in sorted(g["nodes"], key=lambda x: -x["in"])[: args.top]:
        print(f"  {n['in']:4d}  {n['id']}  ({n['group']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
