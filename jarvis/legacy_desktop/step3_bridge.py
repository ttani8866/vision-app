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

import sounddevice as sd
import numpy as np
import keyboard
from faster_whisper import WhisperModel

SAMPLE_RATE = 16000

_model = None


def get_model():
    global _model
    if _model is None:
        print("Whisperモデルを読み込み中...")
        _model = WhisperModel("small", device="cpu", compute_type="int8")
    return _model


def listen_once() -> str:
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

    # 押されるまで待つ
    while not keyboard.is_pressed("space"):
        if keyboard.is_pressed("esc"):
            stream.stop()
            stream.close()
            return "__EXIT__"

    is_recording = True
    print("[録音中]")

    # 離されるまで待つ
    while keyboard.is_pressed("space"):
        pass

    is_recording = False
    stream.stop()
    stream.close()

    if len(recording) == 0:
        return ""

    audio = np.concatenate(recording, axis=0).flatten()
    segments, info = model.transcribe(audio, language="ja")
    text = "".join([seg.text for seg in segments]).strip()
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
