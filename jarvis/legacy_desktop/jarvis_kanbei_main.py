"""
JARVIS フェーズB メインスクリプト（ステップ4〜6統合）

マイク → Whisper文字起こし → Claude Code(KANBEI人格) → VOICEVOX音声出力

事前準備:
  1. VOICEVOXアプリを起動しておく
  2. Claude Codeがインストール済み・ログイン済みであること（ターミナルで `claude` が動く状態）
  3. kanbei_persona.md にKANBEI人格定義を記入しておく

使い方:
  python jarvis_kanbei_main.py

操作:
  スペースキーを押しながら話す → 離すとKANBEIが応答して音声で返す
  Escで終了
"""

import subprocess
import io
import requests
import sounddevice as sd
import soundfile as sf

from step3_bridge import listen_once

VOICEVOX_URL = "http://127.0.0.1:50021"
SPEAKER_ID = 3  # VOICEVOXの話者ID。好みの声に変更可
PERSONA_FILE = "kanbei_persona.md"


def load_persona() -> str:
    with open(PERSONA_FILE, "r", encoding="utf-8") as f:
        return f.read()


def ask_kanbei(user_text: str, persona: str) -> str:
    """
    Claude Codeをヘッドレスモードで呼び出し、KANBEI人格で応答させる。
    """
    result = subprocess.run(
        [
            "claude",
            "-p", user_text,
            "--append-system-prompt", persona,
            "--output-format", "text",
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode != 0:
        print(f"[エラー] Claude Code呼び出し失敗: {result.stderr}")
        return "申し訳ありません、応答の生成に失敗しました。"

    return result.stdout.strip()


def speak(text: str, speaker: int = SPEAKER_ID):
    query_res = requests.post(
        f"{VOICEVOX_URL}/audio_query", params={"text": text, "speaker": speaker}
    )
    query_res.raise_for_status()

    synth_res = requests.post(
        f"{VOICEVOX_URL}/synthesis",
        params={"speaker": speaker},
        json=query_res.json(),
    )
    synth_res.raise_for_status()

    data, samplerate = sf.read(io.BytesIO(synth_res.content))
    sd.play(data, samplerate)
    sd.wait()


def main():
    print("VOICEVOX接続確認中...")
    try:
        requests.get(f"{VOICEVOX_URL}/version", timeout=3)
    except requests.exceptions.ConnectionError:
        print("エラー: VOICEVOXが起動していません。")
        return

    persona = load_persona()
    print("KANBEI起動。スペースキーを押しながら話してください。Escで終了。")

    while True:
        user_text = listen_once()

        if user_text == "__EXIT__":
            print("終了します。")
            break

        if not user_text:
            print("(音声が認識できませんでした)")
            continue

        print(f"[あなた] {user_text}")
        print("[KANBEI] 考え中...")

        reply = ask_kanbei(user_text, persona)
        print(f"[KANBEI] {reply}")

        speak(reply)


if __name__ == "__main__":
    main()
