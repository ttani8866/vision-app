# -*- coding: utf-8 -*-
"""
ばえめし フォロワー推移グラフ生成スクリプト

baemeshi/reports/daily_YYYY-MM-DD.txt を全て読み、
フォロワー数（累計）と新規フォロワー数（日次）の推移を1枚のPNGにする。

出力: baemeshi/reports/follower_trend.png

実行例:
  python -X utf8 baemeshi/plot_follower_trend.py
  python -X utf8 baemeshi/plot_follower_trend.py --dark
  python -X utf8 baemeshi/plot_follower_trend.py --out path/to/other.png

設計上の決まりごと:
  - 2軸グラフ（左右で別スケール）は作らない。累計と日次は上下2段に分ける。
  - 1系列1色。棒を値の大小で塗り分けない。
  - グリッドは実線のヘアライン。破線は使わない。
  - 数値ラベルは全点には振らない（点数が多いときは最新・最大・最小のみ）。
  - 画像に加えて、同じ数値を標準出力に表形式で出す（値が画像だけに閉じないように）。
"""

import argparse
import glob
import os
import re
import sys
from datetime import datetime

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib import font_manager  # noqa: E402
from matplotlib.ticker import FuncFormatter, MaxNLocator  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
DEFAULT_OUT = os.path.join(REPORTS_DIR, "follower_trend.png")

FNAME_RE = re.compile(r"daily_(\d{4}-\d{2}-\d{2})\.txt$")
FOLLOWERS_RE = re.compile(r"^フォロワー:\s*([\d,]+)\s*人", re.MULTILINE)
NEW_FOLLOWERS_RE = re.compile(r"^新規フォロワー[^:：]*[:：]\s*(-?[\d,]+)\s*人", re.MULTILINE)

# 配色トークン（検証済みパレットのスロット1と、チャート用のインク）
THEME = {
    "light": {
        "surface": "#fcfcfb",
        "series": "#2a78d6",
        "ink": "#0b0b0b",
        "ink2": "#52514e",
        "muted": "#898781",
        "grid": "#e1e0d9",
        "baseline": "#c3c2b7",
    },
    "dark": {
        "surface": "#1a1a19",
        "series": "#3987e5",
        "ink": "#ffffff",
        "ink2": "#c3c2b7",
        "muted": "#898781",
        "grid": "#2c2c2a",
        "baseline": "#383835",
    },
}

JP_FONT_CANDIDATES = ["Meiryo", "Yu Gothic", "BIZ UDGothic", "MS Gothic",
                      "MS UI Gothic", "Noto Sans CJK JP", "IPAexGothic"]


def setup_font():
    """環境にある日本語フォントを選ぶ。無ければ警告して続行する。"""
    available = {f.name for f in font_manager.fontManager.ttflist}
    chosen = [n for n in JP_FONT_CANDIDATES if n in available]
    if not chosen:
        print("[警告] 日本語フォントが見つかりません。文字化けする可能性があります。",
              file=sys.stderr)
    plt.rcParams["font.family"] = chosen + ["sans-serif"]
    plt.rcParams["axes.unicode_minus"] = False  # 日本語フォントだと−が豆腐になるため


def to_int(s):
    return int(s.replace(",", ""))


def load_records(reports_dir):
    """daily_*.txt を全て読み、(date, followers, new_followers) のリストを返す。"""
    records = []
    skipped = []
    for path in sorted(glob.glob(os.path.join(reports_dir, "daily_*.txt"))):
        m = FNAME_RE.search(os.path.basename(path))
        if not m:
            continue
        date = m.group(1)
        with open(path, encoding="utf-8") as f:
            text = f.read()

        fm = FOLLOWERS_RE.search(text)
        if not fm:
            skipped.append((os.path.basename(path), "フォロワー数の行が見つからない"))
            continue

        nm = NEW_FOLLOWERS_RE.search(text)
        records.append({
            "date": date,
            "followers": to_int(fm.group(1)),
            "new_followers": to_int(nm.group(1)) if nm else None,
        })

    records.sort(key=lambda r: r["date"])
    return records, skipped


def print_table(records):
    """同じ数値を標準出力にも出す（画像だけに値が閉じないように）。"""
    print(f"{'日付':<12}{'フォロワー数':>12}{'新規':>8}")
    print("-" * 32)
    for r in records:
        nf = "—" if r["new_followers"] is None else f"{r['new_followers']:+d}"
        print(f"{r['date']:<12}{r['followers']:>12,}{nf:>8}")
    print("-" * 32)


def label_indices(values, n_max=10):
    """全点に数値を振らない。点数が少なければ全部、多ければ端と極値だけ。

    近接した候補は先勝ちで捨てる。そうしないと最大値と最新が隣接したときに
    ラベル同士が重なって読めなくなる。
    """
    n = len(values)
    if n == 0:
        return []
    if n <= n_max:
        return list(range(n))
    min_gap = max(2, n // 10)
    chosen = []
    for i in (n - 1, values.index(max(values)), values.index(min(values)), 0):
        if all(abs(i - j) >= min_gap for j in chosen):
            chosen.append(i)
    return sorted(chosen)


def edge_align(i, n):
    """端点のラベルが描画領域からはみ出さないように寄せ方を変える。"""
    if i == 0:
        return "left"
    if i == n - 1:
        return "right"
    return "center"


def tick_positions(n, max_ticks=12):
    """日数が増えたときにx軸ラベルが重なるので間引く。最終日は必ず残す。"""
    if n <= max_ticks:
        return list(range(n))
    step = -(-n // max_ticks)  # 切り上げ
    pos = list(range(0, n, step))
    if pos[-1] != n - 1:
        # 最終日を足すと直前の目盛と隣接して重なることがあるので、その場合は置き換える
        if (n - 1) - pos[-1] < step:
            pos[-1] = n - 1
        else:
            pos.append(n - 1)
    return pos


def build_chart(records, out_path, mode):
    c = THEME[mode]
    dates = [r["date"] for r in records]
    followers = [r["followers"] for r in records]
    x = list(range(len(records)))
    # 新規フォロワーは欠損を0扱いにせず、描画対象から外す
    nf_x = [i for i, r in enumerate(records) if r["new_followers"] is not None]
    nf_y = [records[i]["new_followers"] for i in nf_x]

    fig, (ax1, ax2) = plt.subplots(
        2, 1, figsize=(10, 7.5), dpi=200, sharex=True,
        gridspec_kw={"height_ratios": [1.5, 1], "hspace": 0.28},
    )
    fig.patch.set_facecolor(c["surface"])

    fig.text(0.09, 0.955, "ばえめし フォロワー推移", fontsize=17,
             color=c["ink"], va="top", ha="left")
    period = f"{dates[0]} 〜 {dates[-1]}（{len(dates)}日分）" if dates else "データなし"
    fig.text(0.09, 0.915, f"@baemeshi_official / 対象期間 {period}",
             fontsize=10, color=c["ink2"], va="top", ha="left")

    def style(ax, title):
        ax.set_facecolor(c["surface"])
        ax.set_title(title, fontsize=12, color=c["ink"], loc="left", pad=10)
        ax.grid(axis="y", color=c["grid"], linewidth=0.8, linestyle="-")
        ax.set_axisbelow(True)
        for side in ("top", "right"):
            ax.spines[side].set_visible(False)
        for side in ("left", "bottom"):
            ax.spines[side].set_color(c["baseline"])
            ax.spines[side].set_linewidth(0.8)
        ax.tick_params(colors=c["muted"], labelsize=9, length=0)

    # 上段: 累計フォロワー数（1系列なので凡例は置かない）
    style(ax1, "フォロワー数（累計）")
    ax1.plot(x, followers, color=c["series"], linewidth=2,
             marker="o", markersize=6,
             markerfacecolor=c["series"], markeredgecolor=c["surface"],
             markeredgewidth=2)  # 重なり時の2pxサーフェスリング
    ax1.yaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{int(v):,}"))
    ax1.yaxis.set_major_locator(MaxNLocator(nbins=5, integer=True))
    if len(followers) > 1:
        span = max(followers) - min(followers)
        pad = max(span * 0.14, 4)
        ax1.set_ylim(min(followers) - pad, max(followers) + pad * 1.6)

    for i in label_indices(followers):
        ax1.annotate(f"{followers[i]:,}", (x[i], followers[i]),
                     textcoords="offset points", xytext=(0, 11),
                     ha=edge_align(i, len(followers)), fontsize=9.5,
                     color=c["ink"])

    # 下段: 新規フォロワー数（日次）
    style(ax2, "新規フォロワー数（日次）")
    if nf_x:
        # 日数が少ないうちは棒が太くなりすぎて重く見えるので細くする
        bar_width = 0.55 if len(records) >= 6 else 0.3
        ax2.bar(nf_x, nf_y, width=bar_width, color=c["series"],
                edgecolor=c["surface"], linewidth=1)  # 隣接バー間の2pxギャップ
        ax2.axhline(0, color=c["baseline"], linewidth=0.8)
        ax2.yaxis.set_major_locator(MaxNLocator(nbins=4, integer=True))
        top = max(nf_y + [0])
        bottom = min(nf_y + [0])
        # 負値があるとラベルが下に出るので、その分の余白を確保する
        ax2.set_ylim(bottom - (max(abs(bottom) * 0.4, 3.0) if bottom < 0 else 0),
                     top + max(top * 0.28, 1.5))
        for j in label_indices(nf_y):
            v = nf_y[j]
            ax2.annotate(f"{v:+d}", (nf_x[j], v),
                         textcoords="offset points",
                         xytext=(0, 6 if v >= 0 else -13),
                         ha=edge_align(nf_x[j], len(records)),
                         fontsize=9.5, color=c["ink"])
    else:
        ax2.text(0.5, 0.5, "新規フォロワー数のデータがありません",
                 transform=ax2.transAxes, ha="center", va="center",
                 fontsize=10, color=c["muted"])

    ticks = tick_positions(len(x))
    ax2.set_xticks(ticks)
    ax2.set_xticklabels([dates[i][5:].replace("-", "/") for i in ticks],
                        fontsize=9, color=c["muted"])
    ax2.set_xlim(-0.6, len(x) - 0.4)

    fig.text(0.09, 0.035,
             f"出典: baemeshi/reports/daily_*.txt  |  生成 {datetime.now():%Y-%m-%d %H:%M}",
             fontsize=8, color=c["muted"], ha="left")

    fig.subplots_adjust(left=0.09, right=0.97, top=0.845, bottom=0.11)
    fig.savefig(out_path, facecolor=c["surface"], dpi=200)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description="ばえめしフォロワー推移グラフ生成")
    parser.add_argument("--out", default=DEFAULT_OUT, help="出力PNGパス")
    parser.add_argument("--dark", action="store_true", help="ダークモードで描画")
    parser.add_argument("--reports-dir", default=REPORTS_DIR, help="daily_*.txt の場所")
    args = parser.parse_args()

    setup_font()

    records, skipped = load_records(args.reports_dir)
    for name, reason in skipped:
        print(f"[スキップ] {name}: {reason}", file=sys.stderr)

    if not records:
        print(f"[NG] {args.reports_dir} に読み取れる daily_*.txt がありません", file=sys.stderr)
        sys.exit(1)

    print_table(records)

    if len(records) == 1:
        print("\n[注意] データが1日分しかありません。推移としては読めません。", file=sys.stderr)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    build_chart(records, args.out, "dark" if args.dark else "light")
    print(f"\n出力: {args.out}")


if __name__ == "__main__":
    main()
