"""
ステップ2: VOICEVOX 音声合成 単体テスト

事前準備:
  1. VOICEVOX公式サイトからアプリをダウンロードして起動しておく
     https://voicevox.hiroshiba.jp/
  2. 起動するとローカルでAPIサーバーが立つ（デフォルト: http://127.0.0.1:50021）

使い方:
  python step2_test_voicevox.py

このステップではWhisperもAIも使わない。
「テキストを渡したら声が鳴るか」だけを確認する。
"""

import requests
import sounddevice as sd
import soundfile as sf
import io

VOICEVOX_URL = "http://127.0.0.1:50021"

# speaker一覧は http://127.0.0.1:50021/speakers で確認可能
# 3 = ずんだもん(ノーマル) など。好きな声に変更してよい
SPEAKER_ID = 3


def speak(text: str, speaker: int = SPEAKER_ID):
    # 1. 音声合成用のクエリを作成
    query_res = requests.post(
        f"{VOICEVOX_URL}/audio_query",
        params={"text": text, "speaker": speaker},
    )
    query_res.raise_for_status()
    query = query_res.json()

    # 2. クエリから音声データを生成
    synth_res = requests.post(
        f"{VOICEVOX_URL}/synthesis",
        params={"speaker": speaker},
        json=query,
    )
    synth_res.raise_for_status()

    # 3. 再生
    data, samplerate = sf.read(io.BytesIO(synth_res.content))
    sd.play(data, samplerate)
    sd.wait()


if __name__ == "__main__":
    print("VOICEVOXの接続確認中...")
    try:
        requests.get(f"{VOICEVOX_URL}/version", timeout=3)
    except requests.exceptions.ConnectionError:
        print("エラー: VOICEVOXアプリが起動していません。先に起動してください。")
        exit(1)

    print("接続OK。テスト発話します。")
    speak("こちら、テスト用の音声出力です。正常に聞こえていますか。")
    print("完了。")
