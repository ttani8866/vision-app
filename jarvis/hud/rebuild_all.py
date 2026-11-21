"""目次ノート → グラフ → 判断監査ボードのデータ の順に再生成する（毎朝07:20のタスク jarvis-graph-rebuild と start_hud.bat から呼ぶ）。

1. 目次ノート・グラフ（従来どおり。失敗したらその場で終了）
2. 判断監査ボード用アダプタ（2026-11-21 追加）
   - adapters/keiei_kpi_adapter.py --rebuild  keiei-dashboard の build_data.py を回してから kpi.json
   - adapters/minutes_adapter.py              s議事録 の md から minutes.json
   こちらは失敗してもグラフの生成物は残す。失敗があれば最後に exit 4 で返し、SHU 週次点検が拾えるようにする。
"""
import subprocess, sys
from datetime import datetime
from pathlib import Path

for _st in (sys.stdout, sys.stderr):
    try:
        _st.reconfigure(encoding="utf-8")
    except Exception:
        pass

here = Path(__file__).resolve().parent

for script in ("build_hubs.py", "build_meishi.py", "build_context.py", "build_semantic.py", "build_graph.py"):
    r = subprocess.run([sys.executable, str(here / script), *(["--top", "3"] if script == "build_graph.py" else [])])
    if r.returncode != 0:
        sys.exit(r.returncode)

ADAPTERS = (
    ("経営数字 → kpi.json", ["adapters/keiei_kpi_adapter.py", "--rebuild"]),
    ("議事録 → minutes.json", ["adapters/minutes_adapter.py"]),
)
failed = []
for label, args in ADAPTERS:
    print(f"[rebuild_all] {label}: 開始 {datetime.now():%H:%M:%S}", flush=True)
    r = subprocess.run([sys.executable, str(here / args[0]), *args[1:]])
    if r.returncode != 0:
        failed.append(f"{label}（exit {r.returncode}）")
        print(f"[rebuild_all] {label}: 失敗 exit {r.returncode}", flush=True)
if failed:
    print("[rebuild_all] 判断監査ボードのデータ生成に失敗: " + " / ".join(failed), flush=True)
    sys.exit(4)
