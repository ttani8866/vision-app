# フェーズD-1 召集レーン（KANBEI → CXO ディスパッチ）2026-09-15

## 谷さんの指示
- 質問の内容によって KANBEI が RIN／KAI／SEN などを呼び出す
- 話し相手は KANBEI のまま。「マーケティングなら SEN にプランを指示しました」のように答える
- 用途で使い分ける。KAI＝営業、SEN＝マーケティング、RIN＝財務、RAI＝SNS・広告の定量分析（旧称 KAN）

## 仕組み
1. KANBEI が壁打ち・深掘り系（「どう伸ばす」「戦略」「分析して」など）を「召集レーン」と判定
2. 音声では骨組み（論点3つ）を即答し、「KAIに指示しました。まとまったらお知らせします」と言う
3. 応答の最後の行にマーカー `<<DISPATCH agent=KAI task=...>>` を書く。システムが読み上げから除外し、裏で `claude --agent kai` を起動（voice/cxo_dispatch.py）
4. CXO は Read/Glob/Grep のみ。レポート本文は標準出力で受け取り、Python が VisionX の `04_claude/<領域>/voice_dispatch/` に保存（外部書き込みなし）
5. 完成すると KANBEI に [システム通知] を渡し、「KAIから報告が来ました」で始まる3文の要点報告を音声で行う
   - マイク待機中でも割り込んで報告する（listen_once の idle_check）
   - --text モードは --wait-dispatch で完成まで待てる

## 保存先
| CXO | 保存先 |
|---|---|
| RIN | 04_claude/finance/voice_dispatch/ |
| KAI | 04_claude/sales/voice_dispatch/ |
| SEN | 04_claude/marketing/voice_dispatch/ |
| RAI | 04_claude/advertising/voice_dispatch/ |
| SHU／CHO／JIN／RYU | 04_claude/tech／transformation／hr／creative/voice_dispatch/ |

ファイル名: YYYY-MM-DD_HHMM_<CXO>_<依頼の要約>.md（frontmatter 付き、class C2、status draft）

## 初回テスト（2026-09-15）
- 質問「55期に新東東京で売上を倍に伸ばすには？」
- KANBEI 即答: 展示会の本数／BR事業の深耕／増員の3軸を提示し「KAIに指示しました」。初トークン10.1秒（壁打ちは思考が長い。待機の相槌が出る）
- マーカーは読み上げられず、KAI が裏で起動。判定・振り分けは正しく KAI（営業）
- KAI 本体が600秒でタイムアウト → KANBEI が「KAIからの報告ですが、タイムアウトしました。やり直しますか」と音声で報告（失敗経路も動作）
- 対処は下の「調整」を参照

## 調整（2026-09-15 深夜）
タイムアウトの原因は診断（voice/diag_cxo.py）で2つ判明した。
1. KAI が最初に VisionX 全体を `**/新東*` で Glob していた。Box 同期フォルダ1,000本超への総当たりで数分かかる
2. 55期の PDF（91万文字）を Read して90秒消費

依頼文（cxo_dispatch.build_prompt）に次を追加した。
- 最初に _KANBEI_検索ノート.md を Read し、そこに書かれたパスだけを合計6本まで読む
- ボルト全体の Glob（**/）と Grep は禁止。フォルダ内の絞り込みは2回まで
- .pdf / .xlsx / .docx は読まない。.md のみ
- 無い資料は「未確認」と書いて先に進む
- --max-turns 16、タイムアウト420秒（環境変数 JARVIS_CXO_MAX_TURNS / JARVIS_CXO_TIMEOUT）

診断結果（制約後、PDF除外前）: KAI 149秒・7ターン。検索ノート→拠点別損益→55期提案→clients/products の順に読み、
結論「東京は展示会2本に依存、非展示会部門は営利率約1.2%。倍増は展示会依存を強めるか薄利体質を変えるかの二択」を出力。
PDF 除外後は 60〜90秒短縮の見込み。

## 使い方
- マイク対話中: 壁打ち系の質問をすると KANBEI が骨組みを即答し、数分後に「KAIから報告が来ました」と割り込んで要点を話す
- レポート本文は VisionX の voice_dispatch フォルダ。Obsidian で開ける
- 診断: python voice/diag_cxo.py KAI "相談文" "依頼文"
