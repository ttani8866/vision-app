"""
ステップ1: マイク録音 + Whisper文字起こし 単体テスト

使い方:
  python step1_test_whisper.py

操作:
  スペースキーを押している間だけ録音。離すと文字起こし結果をターミナルに表示。
  Escキーで終了。

このステップではAIへの送信も音声出力も行わない。
「正しく喋った内容がテキストになるか」だけを確認する。
"""

import sounddevice as sd
import numpy as np
import keyboard
from faster_whisper import WhisperModel

SAMPLE_RATE = 16000

print("Whisperモデルを読み込み中...（初回は数十秒かかります）")
# small: 精度と速度のバランス型。速度優先なら "base"、精度優先なら "medium"
model = WhisperModel("small", device="cpu", compute_type="int8")
print("準備完了。スペースキーを押しながら話してください。Escで終了。")

recording = []
is_recording = False


def callback(indata, frames, time, status):
    if is_recording:
        recording.append(indata.copy())


stream = sd.InputStream(
    samplerate=SAMPLE_RATE, channels=1, dtype="float32", callback=callback
)
stream.start()

try:
    while True:
        if keyboard.is_pressed("space") and not is_recording:
            is_recording = True
            recording = []
            print("\n[録音開始]")

        if not keyboard.is_pressed("space") and is_recording:
            is_recording = False
            print("[録音終了] 文字起こし中です、少々お待ちください...")

            if len(recording) == 0:
                print("(音声が録音されませんでした)")
                continue

            audio = np.concatenate(recording, axis=0).flatten()
            segments, info = model.transcribe(
                audio,
                language="ja",
                vad_filter=True,
                condition_on_previous_text=False,
            )
            text = "".join([seg.text for seg in segments])
            print(f"認識結果: {text.strip()}")

        if keyboard.is_pressed("esc"):
            print("\n終了します。")
            break

except KeyboardInterrupt:
    pass
finally:
    stream.stop()
    stream.close()
