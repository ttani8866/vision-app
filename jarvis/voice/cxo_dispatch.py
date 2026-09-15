"""
CXO 召集（ディスパッチ）モジュール

KANBEI が壁打ち・深掘り系の質問を「召集レーン」と判定したとき、応答末尾に
  <<DISPATCH agent=SEN task=55期に新東東京の売上を倍にするマーケ施策案>>
というマーカーを出す。本モジュールはそれを受けて、裏で CXO エージェント
（C:\\claude code\\.claude\\agents の rin / kai / sen / shu / cho / jin / ryu / rai）を
claude --agent で実行し、レポートを VisionX に保存する。完成は poll() で拾い、
KANBEI が音声で要点を報告する。

安全設計:
  - CXO は Read/Glob/Grep のみ。Bash・書き込み・外部 MCP（Gmail/Slack/Notion 等）は禁止
  - レポートの保存は本モジュール（Python）が VisionX 内に行う。外部への書き込みは一切しない
"""
from __future__ import annotations

import os
import queue
import re
import shutil
import subprocess
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

VISIONX_DIR = Path(os.environ.get("JARVIS_VISIONX_DIR", r"C:\Users\tetsuya.tani\Box\obsidian"))
AGENTS_CWD = Path(os.environ.get("JARVIS_AGENTS_CWD", r"C:\claude code"))  # .claude/agents がある場所
CXO_MODEL = os.environ.get("JARVIS_CXO_MODEL", "sonnet")
CXO_TIMEOUT_SEC = int(os.environ.get("JARVIS_CXO_TIMEOUT", "420"))
CXO_MAX_TURNS = int(os.environ.get("JARVIS_CXO_MAX_TURNS", "16"))
LOOKUP_NOTE = VISIONX_DIR / "_KANBEI_検索ノート.md"


def build_prompt(job: "Job") -> str:
    """CXO への依頼文。ボルト全体の Glob/Grep（Box 同期フォルダで数分かかる）を禁止し、検索ノート経由で最大6本だけ読ませる。"""
    return (
        f"KANBEI（参謀）からの指示。谷社長が音声で次の相談をした:\n「{job.origin}」\n\n"
        f"あなた（{job.agent}）への依頼: {job.task}\n\n"
        "資料の探し方（厳守。ボルトは1,000本超あり総当たりは数分かかる）:\n"
        f"1. 最初に {LOOKUP_NOTE} を Read する。質問→ファイルの引き当て表と、主要数字の即答カードがある\n"
        "2. そこに書かれたパスのファイルだけを、合計6本まで Read する\n"
        "3. ボルト全体に対する Glob（**/ を含むパターン）や Grep は禁止。特定フォルダ内の絞り込みも2回まで\n"
        "4. 資料が足りなければ、無いものは「未確認」と書いて先に進む。探し続けない\n"
        "5. .pdf / .xlsx / .docx は読まない（1本で数十万文字になり90秒以上かかる）。.md のみ読む。必要なら「PDF原本は未確認」と書く\n\n"
        "出力: Markdown のレポート本文だけを出力する（前置き・挨拶不要）。\n"
        "構成: 結論（3行以内）／根拠となる数字（出典ファイル名と断面を明記）／打ち手の候補（優先順位付きで最大3つ）／リスクと前提／KANBEI・谷社長に判断してほしい論点（最大3つ）。\n"
        "ルール: 数字は出典の値をそのまま使い丸め直さない。営業利益率の分母と決算期の違いに注意。単月・中間断面で断定しない。\n"
        "共同ピーアールの未公表数値を含む場合は冒頭に警告行を置く。Discord や外部への投稿はしない。ファイルの書き込みもしない（保存はシステムが行う）。"
    )

ALLOWED_TOOLS = "Read,Glob,Grep"
DISALLOWED_TOOLS = ",".join([
    "Bash", "Write", "Edit", "NotebookEdit", "PowerShell",
    "mcp__claude_ai_Gmail", "mcp__claude_ai_Notion", "mcp__claude_ai_Supabase", "mcp__claude_ai_Figma",
    "mcp__claude_ai_Vercel", "mcp__claude_ai_動画作成Higgsfield", "mcp__slack", "mcp__github", "mcp__playwright",
])

# エージェント名 → (agent id, 書込先フォルダ, 呼称)
AGENTS: dict[str, tuple[str, str, str]] = {
    "RIN": ("rin", "04_claude/finance/voice_dispatch", "リン"),
    "KAI": ("kai", "04_claude/sales/voice_dispatch", "カイ"),
    "SEN": ("sen", "04_claude/marketing/voice_dispatch", "セン"),
    "SHU": ("shu", "04_claude/tech/voice_dispatch", "シュウ"),
    "CHO": ("cho", "04_claude/transformation/voice_dispatch", "チョウ"),
    "JIN": ("jin", "04_claude/hr/voice_dispatch", "ジン"),
    "RYU": ("ryu", "04_claude/creative/voice_dispatch", "リュウ"),
    "RAI": ("rai", "04_claude/advertising/voice_dispatch", "ライ"),
}

DISPATCH_RE = re.compile(r"<<\s*DISPATCH\s+agent\s*=\s*([A-Za-z]+)\s+task\s*=\s*(.+?)\s*>>", re.S)


@dataclass
class Job:
    id: int
    agent: str
    task: str
    origin: str
    started: float = field(default_factory=time.perf_counter)
    path: Path | None = None
    text: str = ""
    error: str = ""
    elapsed_sec: float = 0.0


def parse_dispatches(text: str) -> tuple[str, list[tuple[str, str]]]:
    """応答文からマーカーを取り出す。戻り値は (マーカーを除いた本文, [(AGENT, task), ...])。"""
    found = [(a.upper(), t.strip().strip('"「」')) for a, t in DISPATCH_RE.findall(text)]
    clean = DISPATCH_RE.sub("", text).strip()
    return clean, [(a, t) for a, t in found if a in AGENTS]


def _slug(s: str, n: int = 24) -> str:
    s = re.sub(r"[\\/:*?\"<>|\s]+", "_", s).strip("_")
    return s[:n] or "task"


class DispatchManager:
    def __init__(self):
        self._jobs: list[Job] = []
        self._done: queue.Queue = queue.Queue()
        self._seq = 0

    @property
    def running(self) -> list[Job]:
        return [j for j in self._jobs if j.path is None and not j.error]

    def dispatch(self, agent: str, task: str, origin: str) -> Job:
        self._seq += 1
        job = Job(id=self._seq, agent=agent, task=task, origin=origin)
        self._jobs.append(job)
        th = threading.Thread(target=self._run, args=(job,), daemon=True)
        th.start()
        return job

    def poll_peek(self) -> bool:
        """完成ジョブが待っているか（取り出さない）。listen の待機ループから軽く呼ぶ用。"""
        return not self._done.empty()

    def poll(self) -> list[Job]:
        """完成したジョブを取り出す（無ければ空）。"""
        out = []
        while True:
            try:
                out.append(self._done.get_nowait())
            except queue.Empty:
                return out

    def _run(self, job: Job) -> None:
        agent_id, folder, _ = AGENTS[job.agent]
        exe = shutil.which("claude")
        if not exe:
            job.error = "claude コマンドが見つかりません"
            self._done.put(job)
            return
        prompt = build_prompt(job)
        env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
        t0 = time.perf_counter()
        try:
            r = subprocess.run(
                [
                    exe, "--agent", agent_id, "-p", prompt,
                    "--output-format", "text",
                    "--model", CXO_MODEL,
                    "--allowedTools", ALLOWED_TOOLS,
                    "--disallowedTools", DISALLOWED_TOOLS,
                    "--add-dir", str(VISIONX_DIR),
                    "--max-turns", str(CXO_MAX_TURNS),
                ],
                cwd=str(AGENTS_CWD),
                env=env,
                stdin=subprocess.DEVNULL,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=CXO_TIMEOUT_SEC,
            )
            job.text = (r.stdout or "").strip()
            if r.returncode != 0 or not job.text:
                job.error = f"rc={r.returncode} {(r.stderr or '')[:300]}"
        except subprocess.TimeoutExpired:
            job.error = f"タイムアウト（{CXO_TIMEOUT_SEC}秒）"
        job.elapsed_sec = time.perf_counter() - t0

        if not job.error:
            out_dir = VISIONX_DIR / folder
            out_dir.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now().strftime("%Y-%m-%d_%H%M")
            job.path = out_dir / f"{stamp}_{job.agent}_{_slug(job.task)}.md"
            front = (
                "---\n"
                f"summary: JARVIS 音声召集。谷社長の相談「{job.origin}」に対する {job.agent} の分析\n"
                f"updated: {datetime.now().strftime('%Y-%m-%d')}\n"
                "status: draft\n"
                "class: C2\n"
                f"tags: [jarvis, voice_dispatch, {job.agent}]\n"
                "---\n\n"
                f"# {job.agent} レポート（JARVIS 音声召集）\n\n"
                f"相談: {job.origin}\n\n依頼: {job.task}\n\n所要: {job.elapsed_sec:.0f}秒（model={CXO_MODEL}）\n\n---\n\n"
            )
            job.path.write_text(front + job.text + "\n", encoding="utf-8")
        self._done.put(job)


def completion_prompt(job: Job) -> str:
    """完成したレポートを KANBEI に読ませ、音声で要点報告させるための入力。"""
    _, _, kana = AGENTS[job.agent]
    if job.error:
        return (
            f"[システム通知] {job.agent}への指示「{job.task}」が失敗しました（{job.error}）。"
            f"谷社長に1文で伝え、やり直すか聞いてください。冒頭は「{job.agent}からの報告ですが」で始めること。"
        )
    return (
        f"[システム通知] {job.agent}のレポートが完成しました。ファイル: {job.path}\n"
        f"Read して、谷社長に音声で要点を報告してください。冒頭は「{job.agent}から報告が来ました。」で始め、"
        "結論と打ち手の第1候補を合わせて3文以内。詳細を聞くか、別のCXOにも振るかを最後に1文で確認する。"
    )
