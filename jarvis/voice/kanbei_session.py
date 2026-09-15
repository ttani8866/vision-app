"""
KANBEI 常駐セッション（高速化の要）

毎ターン claude を起動し直すとコールドスタートで10〜20秒かかる。
ここでは claude を1プロセスだけ起動し、stream-json で対話を続ける。
  - 起動コストはセッション開始時の1回だけ
  - 会話の文脈が続く（前の発話を踏まえた応答ができる）
  - --include-partial-messages でテキストを逐次受け取り、文単位で TTS に流せる

使い方:
  from kanbei_session import KanbeiSession
  s = KanbeiSession(persona_text)
  s.start()
  reply = s.ask("今日の予定は", on_delta=lambda t: print(t, end=""))
  s.close()
"""
from __future__ import annotations

import json
import os
import queue
import shutil
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

VISIONX_DIR = Path(os.environ.get("JARVIS_VISIONX_DIR", r"C:\Users\tetsuya.tani\Box\obsidian"))
KANBEI_MODEL = os.environ.get("JARVIS_KANBEI_MODEL", "sonnet")
ALLOWED_TOOLS = "Read,Glob,Grep"
DISALLOWED_TOOLS = ",".join([
    "Bash", "Write", "Edit", "NotebookEdit", "PowerShell",
    "mcp__claude_ai_Gmail", "mcp__claude_ai_Notion", "mcp__claude_ai_Supabase", "mcp__claude_ai_Figma",
    "mcp__claude_ai_Vercel", "mcp__claude_ai_動画作成Higgsfield", "mcp__slack", "mcp__github", "mcp__playwright",
])


@dataclass
class Turn:
    text: str = ""
    tools: list[str] = field(default_factory=list)
    first_token_sec: float | None = None
    total_sec: float = 0.0
    is_error: bool = False
    error: str = ""


class KanbeiSession:
    def __init__(self, persona: str, model: str = KANBEI_MODEL, cwd: Path = VISIONX_DIR):
        self.persona = persona
        self.model = model
        self.cwd = cwd
        self.proc: subprocess.Popen | None = None
        self._events: queue.Queue = queue.Queue()
        self._reader: threading.Thread | None = None
        self.session_id: str | None = None

    # ---- lifecycle ----
    def start(self) -> float:
        exe = shutil.which("claude")
        if not exe:
            raise RuntimeError("claude コマンドが見つかりません")
        env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
        t0 = time.perf_counter()
        self.proc = subprocess.Popen(
            [
                exe, "-p",
                "--input-format", "stream-json",
                "--output-format", "stream-json",
                "--verbose",
                "--include-partial-messages",
                "--append-system-prompt", self.persona,
                "--allowedTools", ALLOWED_TOOLS,
                "--disallowedTools", DISALLOWED_TOOLS,
                "--model", self.model,
            ],
            cwd=str(self.cwd),
            env=env,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
        self._reader = threading.Thread(target=self._read_loop, daemon=True)
        self._reader.start()
        # stream-json 入力モードでは最初のユーザーメッセージを受けるまで初期化されない。
        # system/init は最初の ask() の中で受け取る。
        return time.perf_counter() - t0

    def warm_up(self) -> Turn:
        """起動直後に軽いターンを1回回して MCP 接続などを済ませる（体感待ちを起動時に寄せる）。"""
        return self.ask("起動確認。『はい』とだけ答えて。", timeout=90.0)

    def close(self) -> None:
        if self.proc and self.proc.poll() is None:
            try:
                self.proc.stdin.close()
            except Exception:
                pass
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.kill()

    def _read_loop(self) -> None:
        assert self.proc and self.proc.stdout
        for line in self.proc.stdout:
            line = line.strip()
            if not line:
                continue
            try:
                self._events.put(json.loads(line))
            except json.JSONDecodeError:
                continue
        self._events.put({"type": "_eof"})

    def _drain_stderr(self) -> str:
        try:
            return (self.proc.stderr.read() or "")[:500]
        except Exception:
            return ""

    # ---- conversation ----
    def ask(self, text: str, on_delta: Callable[[str], None] | None = None, timeout: float = 60.0) -> Turn:
        if not self.proc or self.proc.poll() is not None:
            raise RuntimeError("セッションが起動していません")
        turn = Turn()
        msg = {"type": "user", "message": {"role": "user", "content": [{"type": "text", "text": text}]}}
        t0 = time.perf_counter()
        self.proc.stdin.write(json.dumps(msg, ensure_ascii=False) + "\n")
        self.proc.stdin.flush()

        streamed: list[str] = []
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                ev = self._events.get(timeout=0.5)
            except queue.Empty:
                if self.proc.poll() is not None:
                    turn.is_error, turn.error = True, "claude が終了しました: " + self._drain_stderr()
                    break
                continue
            et = ev.get("type")
            if et == "system" and ev.get("subtype") == "init":
                self.session_id = ev.get("session_id")
                continue
            if et == "_eof":
                turn.is_error, turn.error = True, "claude の出力が終了しました"
                break
            if et == "stream_event":
                e = ev.get("event", {})
                if e.get("type") == "content_block_delta" and e.get("delta", {}).get("type") == "text_delta":
                    d = e["delta"].get("text", "")
                    if d:
                        if turn.first_token_sec is None:
                            turn.first_token_sec = time.perf_counter() - t0
                        streamed.append(d)
                        if on_delta:
                            on_delta(d)
            elif et == "assistant":
                for c in ev.get("message", {}).get("content", []):
                    if c.get("type") == "tool_use":
                        turn.tools.append(c.get("name", "?"))
            elif et == "result":
                turn.total_sec = time.perf_counter() - t0
                turn.is_error = bool(ev.get("is_error"))
                turn.text = (ev.get("result") or "".join(streamed)).strip()
                if turn.is_error:
                    turn.error = turn.text
                return turn
        else:
            turn.is_error, turn.error = True, "応答がタイムアウトしました"
        turn.total_sec = time.perf_counter() - t0
        turn.text = "".join(streamed).strip()
        return turn


if __name__ == "__main__":
    for _st in (sys.stdout, sys.stderr):
        try:
            _st.reconfigure(encoding="utf-8")
        except Exception:
            pass
    persona = (Path(__file__).resolve().parent.parent / "kanbei_persona.md").read_text(encoding="utf-8")
    s = KanbeiSession(persona)
    boot = s.start()
    w = s.warm_up()
    print(f"[起動] プロセス {boot:.1f}秒 / ウォームアップ {w.total_sec:.1f}秒  session={s.session_id}")
    qs = sys.argv[1:] or ["こんにちは。調子はどう？"]
    for q in qs:
        print(f"\n[あなた] {q}")
        print("[KANBEI] ", end="", flush=True)
        t = s.ask(q, on_delta=lambda d: print(d, end="", flush=True))
        print()
        ft = "-" if t.first_token_sec is None else f"{t.first_token_sec:.1f}"
        err = f" / ERROR {t.error}" if t.is_error else ""
        print(f"  -> 初トークン {ft}秒 / 合計 {t.total_sec:.1f}秒 / ツール {t.tools or 'なし'}{err}")
    s.close()
