"""
JARVIS フェーズB メインスクリプト（ステップ4 本番統合・高速版）

マイク → Whisper文字起こし → KANBEI（claude 常駐セッション） → VOICEVOX（文単位ストリーミング）

設計目標: 発話終了から最初の声が返るまで数秒、長くても10秒。
  - claude は起動時に1回だけ立ち上げ、以後は同じセッションで会話を続ける（コールドスタート排除）
  - 起動時のウォームアップで _KANBEI_検索ノート.md と今日の予定を先読みさせる（以後はツール無しで即答）
  - 応答テキストは文が完成した時点で VOICEVOX に流し、合成済みの文から順に再生する
  - KANBEI は VisionX を作業ディレクトリに Read/Glob/Grep だけ許可。書き込み系ツールは明示的に禁止

事前準備:
  1. VOICEVOX アプリを起動しておく
  2. Claude Code がログイン済み（端末で claude login）
  3. kanbei_persona.md（プロジェクト直下）

使い方:
  python voice/jarvis_kanbei_main.py                       # マイク対話（スペース押下中に話す、Esc で終了）
  python voice/jarvis_kanbei_main.py --text "今日の予定は"   # マイク無しで1往復
  python voice/jarvis_kanbei_main.py --text "A" --text "B"  # 複数往復（同一セッション）
  python voice/jarvis_kanbei_main.py --text "..." --no-play  # 再生せず tests/audio/last_reply.wav に保存
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

for _st in (sys.stdout, sys.stderr):
    try:
        _st.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, str(Path(__file__).parent))
from cxo_dispatch import DispatchManager, completion_prompt, parse_dispatches  # noqa: E402
from kanbei_session import KanbeiSession, VISIONX_DIR  # noqa: E402
from tts_stream import FillerBank, TTSStream, voicevox_alive  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PERSONA_FILE = PROJECT_ROOT / "kanbei_persona.md"
LAST_REPLY_WAV = PROJECT_ROOT / "tests" / "audio" / "last_reply.wav"
FILLER_DIR = PROJECT_ROOT / "tests" / "audio" / "fillers"
TURN_LOG = PROJECT_ROOT / "tests" / "logs" / "turns.jsonl"
WAIT_FILLER_AFTER_SEC = float(os.environ.get("JARVIS_WAIT_FILLER_SEC", "3.0"))
HUD_STATE = PROJECT_ROOT / "hud" / "state.json"
VOICE_COMMANDS_FILE = PROJECT_ROOT / "hud" / "config" / "voice_commands.json"
_state: dict = {"state": "idle", "user": "", "reply": "", "tools": [], "fillers": [], "dispatch": [],
                "panel_focus": None, "timing": {}, "ts": ""}


def load_voice_commands() -> list[dict]:
    """hud/config/voice_commands.json を読む。キーワード追加はこのファイルの編集だけでよい。"""
    try:
        data = json.loads(VOICE_COMMANDS_FILE.read_text(encoding="utf-8"))
        return data.get("commands", [])
    except OSError:
        return []


_VOICE_COMMANDS = load_voice_commands()


def resolve_panel_focus(text: str) -> str | None:
    """発話テキストにパネル切替キーワードが含まれていれば対応するパネルidを返す。一致しなければ None（通常のリング表示）。"""
    for cmd in _VOICE_COMMANDS:
        if cmd.get("keyword") and cmd["keyword"] in text:
            return cmd.get("panel")
    return None


def set_state(**kw) -> None:
    """HUD 用の状態ファイルを更新する（hud/index.html が 0.5 秒ごとに読む）。"""
    _state.update(kw)
    _state["ts"] = datetime.now().isoformat(timespec="milliseconds")
    try:
        HUD_STATE.parent.mkdir(parents=True, exist_ok=True)
        tmp = HUD_STATE.with_suffix(".tmp")
        tmp.write_text(json.dumps(_state, ensure_ascii=False), encoding="utf-8")
        tmp.replace(HUD_STATE)
    except OSError:
        pass

def warm_up_prompt() -> str:
    return (
        f"起動確認。現在時刻は {now_label()} です。次の2つを読み込んでおいてください。"
        "(1) ファイル C:/Users/tetsuya.tani/Box/obsidian/_KANBEI_検索ノート.md を Read する（Glob は不要）。"
        "(2) Google Calendar の list_events で「今日」と「明日」の予定を取得する（読み取りのみ。timeZone は Asia/Tokyo）。"
        "読み込めたら『はい、準備できました』とだけ答えてください。"
    )


WEEKDAYS = "月火水木金土日"


def now_label() -> str:
    n = datetime.now()
    return f"{n.strftime('%Y-%m-%d %H:%M')}（{WEEKDAYS[n.weekday()]}曜）"


def _play_now(wav: bytes) -> None:
    """事前合成済み WAV を別スレッドで即時再生（文字起こしと並行）。"""
    import io
    import sounddevice as sd
    import soundfile as sf

    def _run() -> None:
        try:
            data, sr = sf.read(io.BytesIO(wav))
            sd.play(data, sr)
            sd.wait()
        except Exception:
            pass

    threading.Thread(target=_run, daemon=True).start()


def log_turn(rec: dict) -> None:
    TURN_LOG.parent.mkdir(parents=True, exist_ok=True)
    with TURN_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def one_turn(
    session: KanbeiSession,
    user_text: str,
    play: bool,
    fillers: FillerBank,
    manager: DispatchManager,
    stt_sec: float | None = None,
    is_system: bool = False,
    ack_done: bool = False,
) -> None:
    """1往復。is_system=True はCXO完成通知など内部起点のターン（相槌・待機は出さない）。"""
    print(f"[{'システム' if is_system else 'あなた'}] {user_text[:80]}")
    t0 = time.perf_counter()
    panel_kw = {} if is_system else {"panel_focus": resolve_panel_focus(user_text)}
    set_state(state="thinking", user="" if is_system else user_text, reply="", tools=[], fillers=[], timing={"stt": stt_sec}, **panel_kw)
    tts = TTSStream(play=play, save_path=str(LAST_REPLY_WAV))
    first_token = threading.Event()
    wait_timer: threading.Timer | None = None

    if not is_system and not ack_done:
        # 1) 相槌を即時再生（マイク版はキーを離した瞬間に鳴らし済みなので ack_done=True で来る）
        tts.play_filler(fillers.random_ack(), "ack")
    if ack_done:
        tts.fillers_played.append("ack@release")

        # 2) 初トークンが WAIT_FILLER_AFTER_SEC 以内に来なければ「少しお待ちください」を追加。来ていれば再生しない
        def wait_filler_if_slow() -> None:
            if not first_token.is_set():
                tts.play_filler(fillers.wait_wav, "wait")

        wait_timer = threading.Timer(WAIT_FILLER_AFTER_SEC, wait_filler_if_slow)
        wait_timer.daemon = True
        wait_timer.start()

    print("[KANBEI] ", end="", flush=True)

    # 応答末尾の <<DISPATCH ...>> マーカーは読み上げない。"<<" 以降は TTS に流さず保留する
    acc: list[str] = []
    fed_len = 0

    def on_delta(d: str) -> None:
        nonlocal fed_len
        if not first_token.is_set():
            first_token.set()
            set_state(state="speaking", timing={**_state["timing"], "first_token": round(time.perf_counter() - t0, 1)})
        print(d, end="", flush=True)
        acc.append(d)
        speakable = "".join(acc).split("<<", 1)[0]
        set_state(reply=speakable)
        if len(speakable) > fed_len:
            tts.feed(speakable[fed_len:])
            fed_len = len(speakable)

    prompt_text = user_text if is_system else f"[現在時刻 {now_label()}] {user_text}"
    turn = session.ask(prompt_text, on_delta=on_delta, timeout=90.0)
    if wait_timer:
        wait_timer.cancel()
    first_token.set()
    print()

    # 召集マーカーを取り出し、CXO を裏で起動する
    dispatched: list[str] = []
    if turn.text:
        _, dispatches = parse_dispatches(turn.text)
        for agent, task in dispatches:
            job = manager.dispatch(agent, task, origin=user_text)
            dispatched.append(f"{agent}: {task}")
            print(f"[召集] {agent} ← {task}  (job#{job.id}、裏で実行中)")
    set_state(tools=turn.tools, dispatch=[{"agent": j.agent, "task": j.task, "id": j.id, "done": j.path is not None or bool(j.error)} for j in manager._jobs])
    if turn.is_error or not turn.text:
        msg = "申し訳ありません、応答の生成に失敗しました。"
        if "authenticate" in (turn.error or ""):
            msg = "クロードコードの認証が切れています。端末で claude login を実行してください。"
        print(f"[エラー] {turn.error}", file=sys.stderr)
        tts.feed(msg)
    tts.finish()
    total = time.perf_counter() - t0
    set_state(state="idle", fillers=tts.fillers_played,
              timing={**_state["timing"], "first_audio": None if tts.first_audio_sec is None else round(tts.first_audio_sec, 1),
                      "kanbei": round(turn.total_sec, 1), "total": round(total, 1)})

    ft = "-" if turn.first_token_sec is None else f"{turn.first_token_sec:.1f}"
    fa = "-" if tts.first_audio_sec is None else f"{tts.first_audio_sec:.1f}"
    stt = "" if stt_sec is None else f"文字起こし {stt_sec:.1f}秒 / "
    tools = ", ".join(turn.tools) if turn.tools else "なし"
    fillers_played = "+".join(tts.fillers_played) if tts.fillers_played else "なし"
    print(f"--- {stt}初トークン {ft}秒 / 初音声 {fa}秒 / KANBEI合計 {turn.total_sec:.1f}秒 / 再生込み {total:.1f}秒 / つなぎ: {fillers_played} / ツール: {tools}")
    log_turn({
        "ts": datetime.now().isoformat(timespec="seconds"),
        "user": user_text,
        "reply": turn.text,
        "tools": turn.tools,
        "fillers": tts.fillers_played,
        "dispatched": dispatched,
        "is_system": is_system,
        "stt_sec": stt_sec,
        "first_token_sec": turn.first_token_sec,
        "first_audio_sec": tts.first_audio_sec,
        "kanbei_sec": round(turn.total_sec, 1),
        "total_sec": round(total, 1),
        "error": turn.error,
    })


def announce_completions(session, manager, play, fillers) -> int:
    """完成した CXO レポートがあれば KANBEI に読ませて音声で報告する。報告した件数を返す。"""
    n = 0
    for job in manager.poll():
        status = "失敗" if job.error else f"完成 {job.path}"
        print(f"[召集完了] {job.agent} job#{job.id} {job.elapsed_sec:.0f}秒 → {status}")
        one_turn(session, completion_prompt(job), play=play, fillers=fillers, manager=manager, is_system=True)
        n += 1
    return n


def main() -> int:
    ap = argparse.ArgumentParser(description="JARVIS × KANBEI 音声対話（高速版）")
    ap.add_argument("--text", action="append", help="マイクを使わず、このテキストで1往復（複数指定可）")
    ap.add_argument("--no-play", action="store_true", help="音声を再生せず WAV 保存のみ")
    ap.add_argument("--no-warmup", action="store_true", help="起動時の先読みを省略")
    ap.add_argument("--wait-dispatch", action="store_true", help="--text モードで、召集した CXO の完成報告まで待つ")
    args = ap.parse_args()

    if not voicevox_alive():
        print("エラー: VOICEVOX が起動していません。")
        return 1
    if not PERSONA_FILE.exists():
        print(f"エラー: {PERSONA_FILE} がありません。")
        return 1
    if not VISIONX_DIR.exists():
        print(f"エラー: VisionX ディレクトリが見つかりません: {VISIONX_DIR}")
        return 1

    # つなぎ言葉は起動時に1回だけ合成してディスクにキャッシュ（2回目以降の起動は合成なし）
    fillers = FillerBank(FILLER_DIR)
    t_f = time.perf_counter()
    fillers.load()
    if fillers.synthesized:
        print(f"[つなぎ言葉] {fillers.synthesized}本を合成してキャッシュ（{time.perf_counter() - t_f:.1f}秒、{FILLER_DIR}）")
    else:
        print(f"[つなぎ言葉] キャッシュ命中（{len(fillers.ack_wavs)}+1本、合成なし）")

    persona = PERSONA_FILE.read_text(encoding="utf-8")
    session = KanbeiSession(persona)
    session.start()
    if not args.no_warmup:
        print("KANBEI 起動中（検索ノートと今日の予定を先読み）...", flush=True)
        set_state(state="booting")
        w = session.ask(warm_up_prompt(), timeout=120.0)
        tools = ", ".join(w.tools) if w.tools else "なし"
        print(f"[起動] {w.total_sec:.1f}秒 / ツール: {tools} / {w.text[:40]}")
        if w.is_error:
            print(f"[エラー] {w.error}", file=sys.stderr)

    manager = DispatchManager()
    play = not args.no_play

    try:
        if args.text:
            for t in args.text:
                one_turn(session, t, play=play, fillers=fillers, manager=manager)
            if args.wait_dispatch:
                deadline = time.time() + 900
                while time.time() < deadline:
                    announce_completions(session, manager, play, fillers)
                    if not manager.running and not manager.poll_peek():
                        break
                    time.sleep(2)
            elif manager.running:
                print(f"[注意] 裏で実行中の召集 {len(manager.running)} 件があります。--wait-dispatch で完成報告まで待てます")
            return 0

        from step3_bridge import listen_once  # keyboard 依存はマイク対話時だけ読み込む

        print("KANBEI 待機中。スペースキーを押しながら話してください。Esc で終了。")
        while True:
            announce_completions(session, manager, play, fillers)
            set_state(state="listening", dispatch=[{"agent": j.agent, "task": j.task, "id": j.id, "done": j.path is not None or bool(j.error)} for j in manager._jobs])
            t0 = time.perf_counter()
            # 待機中に CXO レポートが完成したら listen を抜けて報告する
            import step3_bridge

            def _ack() -> None:
                set_state(state="transcribing")
                _play_now(fillers.random_ack())

            user_text = listen_once(idle_check=lambda: bool(manager.poll_peek()), on_release=_ack)
            stt_sec = step3_bridge.last_stt_sec
            if user_text == "__EXIT__":
                print("終了します。")
                break
            if user_text == "__NOTIFY__":
                continue
            if not user_text:
                print("(音声が認識できませんでした)")
                continue
            one_turn(session, user_text, play=play, fillers=fillers, manager=manager, stt_sec=stt_sec, ack_done=True)
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main())
