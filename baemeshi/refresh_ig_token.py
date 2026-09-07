# -*- coding: utf-8 -*-
"""
BAEMESHI_IG_USER_TOKEN の長期トークン再発行＋.env更新スクリプト

使い方は3モード:

  1) 現在のトークンの状態だけ確認（既定・書き込みなし）
       python -X utf8 baemeshi/refresh_ig_token.py --check

  2) 新しいトークンを長期化して .env を更新
       python -X utf8 baemeshi/refresh_ig_token.py --update
     実行するとトークンの入力を求められる（画面に表示されない）。
     Graph API Explorer で取得した短期トークンを貼り付ける。
     コマンドライン引数では渡さない（シェル履歴に残るため）。

  3) 更新せず、長期化と検証だけ試す（.envは書き換えない）
       python -X utf8 baemeshi/refresh_ig_token.py --update --dry-run

処理の流れ（--update）:
  Step 1. 入力トークンを fb_exchange_token で長期トークンに交換
  Step 2. debug_token で有効期限・スコープを確認
  Step 3. 実際に IG アカウントの followers_count を取得できるか疎通確認
  Step 4. .env をバックアップし、BAEMESHI_IG_USER_TOKEN 行だけを差し替え

Step 3 まで全て通らなければ .env は一切書き換えない。
トークンの値は画面にも標準出力にも出さない。

.env に必要なキー:
  - BAEMESHI_IG_USER_TOKEN
  - BAEMESHI_IG_ACCOUNT_ID
  - BEAMESHI_APP_ID        ← 既存の綴り（BAEMESHI_APP_ID でも可）
  - BAEMESHI_APP_SECRET
"""

import argparse
import getpass
import os
import shutil
import sys
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(os.path.dirname(BASE_DIR), ".env")
GRAPH_VER = os.getenv("BAEMESHI_GRAPH_API_VERSION", "v21.0")
GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_VER}"
TOKEN_KEY = "BAEMESHI_IG_USER_TOKEN"

load_dotenv(ENV_PATH)

# APP_ID は .env 側が BEAMESHI_APP_ID と綴られているため両方を見る
APP_ID = os.getenv("BEAMESHI_APP_ID") or os.getenv("BAEMESHI_APP_ID")
APP_SECRET = os.getenv("BAEMESHI_APP_SECRET")
IG_ACCOUNT_ID = os.getenv("BAEMESHI_IG_ACCOUNT_ID")


def fail(msg):
    print(f"[NG] {msg}")
    sys.exit(1)


def fmt_ts(v):
    if v is None:
        return "不明"
    if v == 0:
        return "無期限"
    return datetime.fromtimestamp(v, tz=timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S %z")


def debug_token(token):
    """debug_token でトークン情報を取得する。返り値は data 辞書。"""
    r = requests.get(f"{GRAPH_BASE}/debug_token", params={
        "input_token": token,
        "access_token": f"{APP_ID}|{APP_SECRET}",
    }, timeout=60)
    body = r.json()
    if "error" in body:
        fail(f"debug_token 失敗: {body['error'].get('message')}")
    return body.get("data", {})


def print_token_status(data, label):
    exp = data.get("expires_at")
    print(f"--- {label} ---")
    print(f"  有効: {data.get('is_valid')}  種別: {data.get('type')}  app_id: {data.get('app_id')}")
    print(f"  発行日時: {fmt_ts(data.get('issued_at'))}")
    print(f"  失効日時: {fmt_ts(exp)}")
    print(f"  データアクセス失効: {fmt_ts(data.get('data_access_expires_at'))}")
    print(f"  スコープ: {', '.join(data.get('scopes', [])) or '(なし)'}")
    if exp:
        days = (datetime.fromtimestamp(exp, tz=timezone.utc) - datetime.now(timezone.utc)).days
        print(f"  残り日数: {days}日")
        return days
    return None


def exchange_to_long_lived(token):
    """短期トークンを長期トークンに交換する。"""
    r = requests.get(f"{GRAPH_BASE}/oauth/access_token", params={
        "grant_type": "fb_exchange_token",
        "client_id": APP_ID,
        "client_secret": APP_SECRET,
        "fb_exchange_token": token,
    }, timeout=60)
    body = r.json()
    if "error" in body:
        fail(f"長期トークン交換に失敗: {body['error'].get('message')}")
    new_token = body.get("access_token")
    if not new_token:
        fail(f"レスポンスに access_token がない: {body}")
    return new_token


def verify_ig_access(token):
    """実際に IG のフォロワー数が取れるか疎通確認する。"""
    r = requests.get(f"{GRAPH_BASE}/{IG_ACCOUNT_ID}", params={
        "access_token": token,
        "fields": "username,followers_count",
    }, timeout=60)
    body = r.json()
    if "error" in body:
        fail(f"IGアカウント疎通確認に失敗: {body['error'].get('message')}")
    return body


def update_env(new_token):
    """.env をバックアップし、トークン行だけを差し替える。他の行は変更しない。"""
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = f"{ENV_PATH}.{stamp}.bak"
    shutil.copy2(ENV_PATH, backup)

    with open(ENV_PATH, encoding="utf-8") as f:
        lines = f.read().splitlines()

    replaced = False
    for i, line in enumerate(lines):
        if line.split("=", 1)[0].strip() == TOKEN_KEY:
            lines[i] = f"{TOKEN_KEY}={new_token}"
            replaced = True
            break
    if not replaced:
        lines.append(f"{TOKEN_KEY}={new_token}")

    tmp = f"{ENV_PATH}.tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    os.replace(tmp, ENV_PATH)
    return backup, replaced


def main():
    parser = argparse.ArgumentParser(description="IG長期トークンの確認・再発行・.env更新")
    parser.add_argument("--check", action="store_true", help="現在のトークン状態のみ確認（既定）")
    parser.add_argument("--update", action="store_true", help="新トークンを長期化して.envを更新")
    parser.add_argument("--dry-run", action="store_true", help="--update時、.envを書き換えず検証まで")
    args = parser.parse_args()

    if not (APP_ID and APP_SECRET):
        fail("BEAMESHI_APP_ID / BAEMESHI_APP_SECRET が .env にありません")
    if not IG_ACCOUNT_ID:
        fail("BAEMESHI_IG_ACCOUNT_ID が .env にありません")

    if not args.update:
        current = os.getenv(TOKEN_KEY)
        if not current:
            fail(f"{TOKEN_KEY} が .env にありません")
        days = print_token_status(debug_token(current), "現在のトークン")
        if days is not None and days <= 14:
            print(f"\n[要対応] 残り{days}日です。--update で再発行してください。")
        return

    print("Graph API Explorer で取得した新しいトークンを貼り付けてください（入力は表示されません）")
    raw = getpass.getpass("token> ").strip()
    if not raw:
        fail("トークンが入力されませんでした")

    print("\nStep 1: 長期トークンへ交換中...")
    long_token = exchange_to_long_lived(raw)
    print("  交換成功")

    print("\nStep 2: 新トークンを検証中...")
    data = debug_token(long_token)
    days = print_token_status(data, "新トークン")
    if not data.get("is_valid"):
        fail("新トークンが無効です")
    required = {"instagram_basic"}
    missing = required - set(data.get("scopes", []))
    if missing:
        fail(f"必要スコープが不足: {', '.join(sorted(missing))}")
    if days is not None and days < 30:
        print(f"  [警告] 残り{days}日しかありません。通常は約60日です。")
        print("         元トークンが長期トークンだった可能性があります。")
        print("         Graph API Explorer で再認証し、短期トークンを取り直してください。")

    print("\nStep 3: IGアカウント疎通確認中...")
    ig = verify_ig_access(long_token)
    print(f"  取得成功: @{ig.get('username')} / フォロワー {ig.get('followers_count'):,}人")

    if args.dry_run:
        print("\n--dry-run のため .env は更新していません。")
        print("問題なければ --dry-run を外して再実行してください（トークンの再入力が必要です）。")
        return

    print("\nStep 4: .env を更新中...")
    backup, replaced = update_env(long_token)
    print(f"  バックアップ: {os.path.basename(backup)}")
    print(f"  {TOKEN_KEY} を{'差し替えました' if replaced else '追記しました'}")

    print("\n完了。次のコマンドで日次スクリプトの動作確認をしてください:")
    print('  python -X utf8 baemeshi/daily_report.py')


if __name__ == "__main__":
    main()
