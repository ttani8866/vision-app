"""
ステップ3: 橋渡しスクリプト（AI接続前の最終確認地点）

ステップ1の録音+文字起こし部分を関数化し、繰り返し呼び出せる形にする。
ここではまだClaude CodeにもVOICEVOXにも接続しない。
「文字起こし結果を安定して取得できる状態」を作ることが目的。

使い方:
  python step3_bridge.py
  スペースキーを押しながら話す→離すと文字起こし結果を表示、を繰り返す。
  Escで終了。
"""

import sys
import time
import sounddevice as sd

for _st in (sys.stdout, sys.stderr):
    try:
        _st.reconfigure(encoding="utf-8")
    except Exception:
        pass
import numpy as np
import keyboard
from faster_whisper import WhisperModel

SAMPLE_RATE = 16000

# 固有名詞の誤変換を減らす語彙ヒント（B-1 で効果確認済み）
VOCAB_HINT = (
    "KANBEI、新東通信、共同ピーアール、VAZ、KeyWalker、Meisis、VisionX、"
    "RIN、KAI、SHU、CHO、JIN、SEN、RYU、RAI、Obsidian、Claude Code。"
)

_model = None


def get_model():
    global _model
    if _model is None:
        print("Whisperモデルを読み込み中...")
        _model = WhisperModel("small", device="cpu", compute_type="int8")
    return _model


last_stt_sec = 0.0


def listen_once(idle_check=None, on_release=None) -> str:
    """
    スペースキーを押している間だけ録音し、離した時点で文字起こし結果を返す。
    ブロッキング関数。呼び出し元は1発話ぶんのテキストを受け取る。
    """
    model = get_model()
    recording = []
    is_recording = False

    def callback(indata, frames, time, status):
        if is_recording:
            recording.append(indata.copy())

    stream = sd.InputStream(
        samplerate=SAMPLE_RATE, channels=1, dtype="float32", callback=callback
    )
    stream.start()

    print("[待機中] スペースキーを押しながら話してください")

    # 押されるまで待つ（idle_check が True を返したら "__NOTIFY__" で抜ける。CXO レポート完成の割り込み用）
    while not keyboard.is_pressed("space"):
        if keyboard.is_pressed("esc"):
            stream.stop()
            stream.close()
            return "__EXIT__"
        if idle_check is not None and idle_check():
            stream.stop()
            stream.close()
            return "__NOTIFY__"
        time.sleep(0.02)

    is_recording = True
    print("[録音中]")

    # 離されるまで待つ
    while keyboard.is_pressed("space"):
        pass

    is_recording = False
    stream.stop()
    stream.close()
    if on_release is not None:
        on_release()  # キーを離した瞬間に相槌を鳴らす（文字起こし中の無音を埋める）

    if len(recording) == 0:
        return ""

    global last_stt_sec
    t0 = time.perf_counter()
    audio = np.concatenate(recording, axis=0).flatten()
    # beam_size=1: 実測で精度同等のまま約4割速い（small, 8.9秒音声で 5.4秒→3.3秒）
    segments, info = model.transcribe(
        audio, language="ja", beam_size=1, vad_filter=True, initial_prompt=VOCAB_HINT,
        condition_on_previous_text=False,
    )
    text = "".join([seg.text for seg in segments]).strip()
    last_stt_sec = time.perf_counter() - t0
    print(f"[文字起こし {last_stt_sec:.1f}秒]")
    return text


if __name__ == "__main__":
    print("準備完了。Escで終了。")
    while True:
        text = listen_once()
        if text == "__EXIT__":
            print("終了します。")
            break
        if text:
            print(f"認識結果: {text}")
        else:
            print("(音声が録音されませんでした)")
