"""
CXO 召集の診断: 本番と同じ依頼文で claude --agent を stream-json 実行し、ツール呼び出しと所要時間を表示する。

使い方:
  python voice/diag_cxo.py KAI "55期に新東東京で売上を倍に伸ばすには？" "東京本社の55期売上倍増シナリオを立案"
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from cxo_dispatch import (  # noqa: E402
    AGENTS, ALLOWED_TOOLS, CXO_MAX_TURNS, CXO_MODEL, CXO_TIMEOUT_SEC, DISALLOWED_TOOLS, VISIONX_DIR, AGENTS_CWD, Job, build_prompt,
)

for _st in (sys.stdout, sys.stderr):
    try:
        _st.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def main() -> int:
    agent, origin, task = sys.argv[1].upper(), sys.argv[2], sys.argv[3]
    job = Job(id=0, agent=agent, task=task, origin=origin)
    exe = shutil.which("claude")
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
    t0 = time.perf_counter()
    proc = subprocess.Popen(
        [
            exe, "--agent", AGENTS[agent][0], "-p", build_prompt(job),
            "--output-format", "stream-json", "--verbose",
            "--model", CXO_MODEL,
            "--allowedTools", ALLOWED_TOOLS,
            "--disallowedTools", DISALLOWED_TOOLS,
            "--add-dir", str(VISIONX_DIR),
            "--max-turns", str(CXO_MAX_TURNS),
        ],
        cwd=str(AGENTS_CWD), env=env, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, encoding="utf-8", errors="replace",
    )
    result = ""
    for line in proc.stdout:
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        el = time.perf_counter() - t0
        if d.get("type") == "assistant":
            for c in d["message"].get("content", []):
                if c.get("type") == "tool_use":
                    print(f"{el:6.1f}s tool_use {c['name']} {json.dumps(c['input'], ensure_ascii=False)[:120]}", flush=True)
        elif d.get("type") == "user":
            for c in d["message"].get("content", []):
                if isinstance(c, dict) and c.get("type") == "tool_result":
                    txt = c.get("content")
                    txt = txt if isinstance(txt, str) else json.dumps(txt, ensure_ascii=False)
                    print(f"{el:6.1f}s   result {len(txt)} chars", flush=True)
        elif d.get("type") == "result":
            result = d.get("result") or ""
            print(f"{el:6.1f}s RESULT turns={d.get('num_turns')} err={d.get('is_error')} len={len(result)}", flush=True)
    proc.wait(timeout=CXO_TIMEOUT_SEC)
    print("----- 本文（先頭800字） -----")
    print(result[:800])
    return 0


if __name__ == "__main__":
    sys.exit(main())
