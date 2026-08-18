#!/usr/bin/env bash
# ばえめし Meta システムユーザートークン検証スクリプト
#
# 使い方（トークンはファイルに書かず、環境変数で渡す）:
#   META_SYSTEM_USER_TOKEN='EAA...' bash verify_meta_token.sh
#
# 検証内容:
#   1. トークンが有効か（/me）
#   2. 無期限トークンか・付与スコープ（/debug_token）
#   3. ばえめしIGアカウントへのアクセス（instagram_basic / insights）
#   4. 広告アカウントへのアクセス（ads_read）
#   5. Facebookページ一覧（pages_show_list）
set -u

API="https://graph.facebook.com/v23.0"
IG_USER_ID="17841450708912874"          # @baemeshi_official
AD_ACCOUNT="act_598774024775324"        # ばえめし広告アカウント
REQUIRED_SCOPES="instagram_basic instagram_manage_insights instagram_content_publish ads_read pages_show_list pages_read_engagement"

TOKEN="${META_SYSTEM_USER_TOKEN:-${1:-}}"
if [ -z "$TOKEN" ]; then
  echo "エラー: トークンが指定されていません。"
  echo "  META_SYSTEM_USER_TOKEN='EAA...' bash $0"
  exit 1
fi

pass=0; fail=0
check() { # check <ラベル> <URL>
  local label="$1" url="$2" body
  body=$(curl -sS --max-time 30 "$url") || { echo "✗ $label: 通信エラー"; fail=$((fail+1)); return 1; }
  if echo "$body" | grep -q '"error"'; then
    echo "✗ $label"
    echo "$body" | head -c 500; echo
    fail=$((fail+1)); return 1
  fi
  echo "✓ $label"
  echo "$body" | head -c 300; echo; echo
  pass=$((pass+1)); return 0
}

echo "=== 1. トークン有効性（/me） ==="
check "システムユーザー確認" "$API/me?fields=id,name&access_token=$TOKEN"

echo "=== 2. トークン詳細（/debug_token） ==="
DEBUG=$(curl -sS --max-time 30 "$API/debug_token?input_token=$TOKEN&access_token=$TOKEN")
if echo "$DEBUG" | grep -q '"error"'; then
  echo "△ debug_token は取得できませんでした（システムユーザートークンでは失敗する場合があります。他の項目がすべて✓なら問題ありません）"
  echo "$DEBUG" | head -c 300; echo
else
  echo "$DEBUG" | head -c 800; echo
  if echo "$DEBUG" | grep -q '"expires_at":0'; then
    echo "✓ 無期限トークンです（expires_at: 0）"
  else
    echo "△ 注意: expires_at が 0 ではありません。有効期限がある可能性があります。上の出力を確認してください。"
  fi
  echo "--- スコープ確認 ---"
  for s in $REQUIRED_SCOPES; do
    if echo "$DEBUG" | grep -q "\"$s\""; then echo "  ✓ $s"; else echo "  ✗ $s が見当たりません"; fi
  done
fi
echo

echo "=== 3. ばえめしInstagramアカウント ==="
check "IGプロフィール取得（instagram_basic）" "$API/$IG_USER_ID?fields=username,followers_count,media_count&access_token=$TOKEN"
check "IGインサイト取得（instagram_manage_insights）" "$API/$IG_USER_ID/insights?metric=reach&period=day&access_token=$TOKEN"

echo "=== 4. 広告アカウント（ads_read） ==="
check "広告アカウント情報" "$API/$AD_ACCOUNT?fields=name,account_status,currency&access_token=$TOKEN"
check "広告消化額（昨日）" "$API/$AD_ACCOUNT/insights?fields=spend,ctr,impressions&date_preset=yesterday&access_token=$TOKEN"

echo "=== 5. Facebookページ（pages_show_list） ==="
check "ページ一覧" "$API/me/accounts?fields=id,name&access_token=$TOKEN"

echo "=================================="
echo "結果: 成功 $pass 件 / 失敗 $fail 件"
if [ "$fail" -eq 0 ]; then
  echo "→ すべてOK。日次レポートのトークンを差し替えて問題ありません。"
else
  echo "→ 失敗があります。上記のエラー内容をドン・キンボールさんに共有して、システムユーザーへのアセット割当・権限を確認してください。"
  exit 1
fi
