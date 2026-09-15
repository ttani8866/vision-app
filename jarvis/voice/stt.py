"""
JARVIS Phase B / Step 1 : 音声入力（マイク録音 → faster-whisper 文字起こし）

使い方:
  python voice/stt.py --devices                 # 入力デバイス一覧
  python voice/stt.py --file tests/audio/x.wav  # WAVファイルを文字起こし
  python voice/stt.py --seconds 5               # 5秒録音して文字起こし
  python voice/stt.py                           # Push-to-talk（Enterで開始 / Enterで停止）

環境変数:
  JARVIS_STT_MODEL  faster-whisper のモデルサイズ（既定: small）
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass

import numpy as np

# Windows コンソール(cp932)での文字化け防止
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

SAMPLE_RATE = 16000  # Whisper の入力は 16kHz mono
DEFAULT_MODEL = os.environ.get("JARVIS_STT_MODEL", "small")

# 固有名詞の誤変換を減らすための語彙ヒント（Whisper の initial_prompt に渡す）
VOCAB_HINT = (
    "KANBEI、新東通信、共同ピーアール、VAZ、KeyWalker、Meisis、VisionX、"
    "GEN、RIN、KAI、SHU、CHO、JIN、SEN、RYU、Obsidian、Claude Code。"
)

_model_cache: dict[str, object] = {}


@dataclass
class STTResult:
    text: str
    language: str
    audio_sec: float
    load_sec: float
    infer_sec: float


def load_model(model_size: str = DEFAULT_MODEL):
    """faster-whisper モデルをロード（プロセス内でキャッシュ）。CPU / int8 前提。"""
    if model_size in _model_cache:
        return _model_cache[model_size], 0.0
    from faster_whisper import WhisperModel

    t0 = time.perf_counter()
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    load_sec = time.perf_counter() - t0
    _model_cache[model_size] = model
    return model, load_sec


def list_devices() -> None:
    import sounddevice as sd

    print(sd.query_devices())
    print(f"\n既定の入力デバイス index: {sd.default.device[0]}")


def record_fixed(seconds: float, device: int | None = None) -> np.ndarray:
    """指定秒数だけ録音して float32 mono 配列を返す。"""
    import sounddevice as sd

    print(f"録音中... {seconds:.1f}秒")
    audio = sd.rec(
        int(seconds * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
        device=device,
    )
    sd.wait()
    return audio.reshape(-1)


def record_push_to_talk(device: int | None = None) -> np.ndarray:
    """Enter で録音開始、もう一度 Enter で停止。"""
    import sounddevice as sd

    chunks: list[np.ndarray] = []

    def callback(indata, frames, time_info, status):
        if status:
            print(status, file=sys.stderr)
        chunks.append(indata.copy().reshape(-1))

    input("Enter を押すと録音開始 > ")
    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
        device=device,
        callback=callback,
    ):
        input("録音中... Enter で停止 > ")
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(chunks)


def load_wav(path: str) -> np.ndarray:
    """WAV を読み込み 16kHz mono float32 にそろえる。"""
    import soundfile as sf

    data, sr = sf.read(path, dtype="float32", always_2d=True)
    mono = data.mean(axis=1)
    if sr != SAMPLE_RATE:
        # 簡易リサンプル（線形補間）。品質重視なら resampy 等に差し替え。
        n_out = int(len(mono) * SAMPLE_RATE / sr)
        x_old = np.linspace(0.0, 1.0, num=len(mono), endpoint=False)
        x_new = np.linspace(0.0, 1.0, num=n_out, endpoint=False)
        mono = np.interp(x_new, x_old, mono).astype(np.float32)
    return mono


def transcribe(audio: np.ndarray, model_size: str = DEFAULT_MODEL, language: str = "ja") -> STTResult:
    model, load_sec = load_model(model_size)
    t0 = time.perf_counter()
    segments, info = model.transcribe(
        audio,
        language=language,
        beam_size=5,
        vad_filter=True,
        initial_prompt=VOCAB_HINT,
    )
    text = "".join(seg.text for seg in segments).strip()
    infer_sec = time.perf_counter() - t0
    return STTResult(
        text=text,
        language=info.language,
        audio_sec=len(audio) / SAMPLE_RATE,
        load_sec=load_sec,
        infer_sec=infer_sec,
    )


def main() -> int:
    p = argparse.ArgumentParser(description="JARVIS STT (faster-whisper)")
    p.add_argument("--devices", action="store_true", help="入力デバイス一覧を表示")
    p.add_argument("--file", help="WAV ファイルを文字起こし")
    p.add_argument("--seconds", type=float, help="指定秒数だけ録音して文字起こし")
    p.add_argument("--device", type=int, default=None, help="入力デバイス index")
    p.add_argument("--model", default=DEFAULT_MODEL, help="モデルサイズ (tiny/base/small/medium/large-v3)")
    args = p.parse_args()

    if args.devices:
        list_devices()
        return 0

    if args.file:
        audio = load_wav(args.file)
    elif args.seconds:
        audio = record_fixed(args.seconds, device=args.device)
    else:
        audio = record_push_to_talk(device=args.device)

    if audio.size == 0:
        print("音声が空です。")
        return 1

    r = transcribe(audio, model_size=args.model)
    print("\n=== 文字起こし結果 ===")
    print(r.text)
    print("\n--- 処理時間 ---")
    print(f"音声長      : {r.audio_sec:6.2f} 秒")
    print(f"モデル読込  : {r.load_sec:6.2f} 秒 (初回のみ)")
    print(f"推論        : {r.infer_sec:6.2f} 秒  (model={args.model}, lang={r.language})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
