"""
文単位ストリーミング TTS（VOICEVOX）

LLM から流れてくるテキストを句点で区切り、1文できた時点で合成を始め、
合成済みの文から順に再生する。「全文が出てから合成→再生」に比べて
最初の声が出るまでの時間を数秒に縮める。

使い方:
  t = TTSStream()
  t.feed("今日は")   # 逐次 feed
  t.feed("晴れです。明日は雨。")
  t.finish()         # 残りを流し、再生完了まで待つ
  print(t.first_audio_sec)
"""
from __future__ import annotations

import io
import os
import queue
import re
import threading
import time

import requests
import sounddevice as sd
import soundfile as sf

VOICEVOX_URL = "http://127.0.0.1:50021"
SPEAKER_ID = int(os.environ.get("JARVIS_SPEAKER_ID", "13"))
SPEED = float(os.environ.get("JARVIS_TTS_SPEED", "1.1"))  # 1.0 が標準。少し速めにすると会話が締まる
SENT_END = re.compile(r"(?<=[。！？!?\n])")
MAX_CHUNK = int(os.environ.get("JARVIS_TTS_MAX_CHUNK", "30"))  # この文字数を超えたら読点で先に切る
FIRST_CHUNK = int(os.environ.get("JARVIS_TTS_FIRST_CHUNK", "14"))  # 最初の塊はさらに短く


def synthesize(text: str, speaker: int = SPEAKER_ID, speed: float = SPEED) -> bytes:
    q = requests.post(f"{VOICEVOX_URL}/audio_query", params={"text": text, "speaker": speaker}, timeout=30)
    q.raise_for_status()
    query = q.json()
    query["speedScale"] = speed
    query["prePhonemeLength"] = 0.05
    query["postPhonemeLength"] = 0.05
    r = requests.post(f"{VOICEVOX_URL}/synthesis", params={"speaker": speaker}, json=query, timeout=120)
    r.raise_for_status()
    return r.content


def voicevox_alive() -> bool:
    try:
        requests.get(f"{VOICEVOX_URL}/version", timeout=3)
        return True
    except requests.exceptions.RequestException:
        return False


class FillerBank:
    """つなぎ言葉の事前合成キャッシュ。起動時に1回だけ合成し WAV をディスクに置く。再生時は合成しない。"""

    ACK_TEXTS = ["JARVIS、わかりました", "はい", "承知しました"]
    WAIT_TEXT = "少しお待ちください"

    def __init__(self, cache_dir: str | os.PathLike, speaker: int = SPEAKER_ID):
        import random
        from pathlib import Path

        self._random = random
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.speaker = speaker
        self.ack_wavs: list[bytes] = []
        self.wait_wav: bytes = b""
        self.synthesized = 0  # この起動で新たに合成した本数（0 ならすべてキャッシュ命中）

    def load(self) -> None:
        for i, text in enumerate(self.ACK_TEXTS):
            self.ack_wavs.append(self._get(f"ack{i}", text))
        self.wait_wav = self._get("wait", self.WAIT_TEXT)

    def _get(self, key: str, text: str) -> bytes:
        path = self.cache_dir / f"filler_{self.speaker}_{key}.wav"
        if path.exists():
            return path.read_bytes()
        wav = synthesize(text)
        path.write_bytes(wav)
        self.synthesized += 1
        return wav

    def random_ack(self) -> bytes:
        return self._random.choice(self.ack_wavs)


class TTSStream:
    def __init__(self, play: bool = True, save_path: str | None = None):
        self.play = play
        self.save_path = save_path
        self._buf = ""
        self._synth_q: queue.Queue = queue.Queue()
        self._play_q: queue.Queue = queue.Queue()
        self._t0 = time.perf_counter()
        self.first_audio_sec: float | None = None
        self.synth_sec_total = 0.0
        self.sentences: list[str] = []
        self._chunks: list[bytes] = []
        self.fillers_played: list[str] = []
        self._synth_th = threading.Thread(target=self._synth_loop, daemon=True)
        self._play_th = threading.Thread(target=self._play_loop, daemon=True)
        self._synth_th.start()
        self._play_th.start()

    def play_filler(self, wav: bytes, label: str = "filler") -> None:
        """事前合成済みの WAV を再生キューの現在位置に積む（合成はしない）。"""
        self.fillers_played.append(label)
        self._play_q.put(("filler", wav))

    def feed(self, delta: str) -> None:
        self._buf += delta
        parts = SENT_END.split(self._buf)
        # 最後の要素は文末未確定なので残す
        for s in parts[:-1]:
            self._enqueue(s)
        self._buf = parts[-1]
        # 文末が来なくても、長くなったら読点で先に切って合成を始める（初音声を早くする）
        # VOICEVOX の合成時間は音声長の約0.8倍。最初の塊だけ短く（約14文字≒1.5秒）して初音声を前倒しする
        # 読点が無い長い節は、助詞の直後で切る（読点が来るまで待つと1文丸ごと合成して10秒以上待たされる）
        limit = FIRST_CHUNK if not self.sentences else MAX_CHUNK
        while len(self._buf) > limit:
            slack = 6 if not self.sentences else 14  # 最初の塊は読点探索の余裕も小さくして確実に短く切る
            window = self._buf[: limit + slack]
            cut = window.rfind("、") + 1
            if cut <= 0:
                if len(self._buf) <= limit + slack:
                    break  # まだ読点が来るかもしれないので待つ
                cut = max(window.rfind(ch) for ch in "てでにとがはをのへ") + 1
                if cut <= 4:
                    cut = len(window)
            self._enqueue(self._buf[:cut])
            self._buf = self._buf[cut:]
            limit = MAX_CHUNK

    def finish(self) -> None:
        if self._buf.strip():
            self._enqueue(self._buf)
        self._buf = ""
        self._synth_q.put(None)
        self._synth_th.join()
        self._play_th.join()
        if self.save_path and self._chunks:
            self._save()

    def _enqueue(self, s: str) -> None:
        s = s.strip()
        if not s:
            return
        # 読み上げ不要な記号を落とす
        s = re.sub(r"[*#`<>\-]+", "", s).strip()
        if s:
            self.sentences.append(s)
            self._synth_q.put(s)

    def _synth_loop(self) -> None:
        while True:
            s = self._synth_q.get()
            if s is None:
                self._play_q.put(None)
                return
            t = time.perf_counter()
            try:
                wav = synthesize(s)
            except Exception as e:  # VOICEVOX 側の失敗は読み飛ばす
                print(f"[TTS エラー] {e}")
                continue
            self.synth_sec_total += time.perf_counter() - t
            self._chunks.append(wav)
            self._play_q.put(("reply", wav))

    def _play_loop(self) -> None:
        while True:
            item = self._play_q.get()
            if item is None:
                return
            kind, wav = item
            if kind == "reply" and self.first_audio_sec is None:
                self.first_audio_sec = time.perf_counter() - self._t0
            if self.play:
                data, sr = sf.read(io.BytesIO(wav))
                sd.play(data, sr)
                sd.wait()

    def _save(self) -> None:
        import numpy as np
        datas, sr = [], None
        for wav in self._chunks:
            d, sr = sf.read(io.BytesIO(wav))
            datas.append(d)
        sf.write(self.save_path, np.concatenate(datas), sr)


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    text = " ".join(sys.argv[1:]) or "はい、官兵衛です。今日の予定は9時から定例会、10時半から社内ミーティングです。午後は滝学園から新大阪へ移動します。"
    t = TTSStream(play=False, save_path=None)
    for i in range(0, len(text), 8):  # LLM のストリーミングを模して8文字ずつ
        t.feed(text[i:i + 8])
        time.sleep(0.03)
    t.finish()
    print(f"文数 {len(t.sentences)} / 初音声 {t.first_audio_sec:.1f}秒 / 合成合計 {t.synth_sec_total:.1f}秒")
