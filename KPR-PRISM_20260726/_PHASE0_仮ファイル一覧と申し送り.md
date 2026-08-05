# フェーズ0 申し送り — 仮ファイル一覧と参照整合チェック結果

作成日：2026-08-05／作成：Claude Code（フェーズ0：パッケージ実体の確定）
本ファイルはフェーズ0の作業記録です。仮ファイルがすべて正式版に差し替わったら本ファイルは削除してかまいません。

## 1. 仮ファイル一覧（正式版と要差し替え）

以下は正式版が未入手のため、パッケージ文書の記載から復元・新規作成した仮版です。各ファイル冒頭に【仮ファイル／ダミー】の注記があります。差し替え時は注記ごとファイルを置き換えてください。

| ファイル | 復元の根拠 | 差し替え優先度 |
|---|---|---|
| templates/骨子テンプレート.md | 内容案 第2部§3、kpr.md §3 | 高（骨子の型そのもの） |
| templates/レビュー評価表.md | README・SETUP_GUIDEの5観点記載 | 高（フェーズ2の採点に使用） |
| clients/_雛形_案件フォルダ/brief.md | 与件6項目の各文書記載 | 中 |
| .claude/skills/prworks-pressrelease/SKILL.md | READMEの一覧のみ（中身は最低限） | 中（骨子フローでは未使用） |
| .claude/skills/prworks-newsletter/SKILL.md | 同上＋KPR-Kikakusho-Sakuseiの記載 | 中 |
| .claude/skills/prworks-medialist/SKILL.md | 同上＋prworks-annaijo・CLAUDE.mdの記載 | 中 |
| .claude/skills/prworks-unei-manual/SKILL.md | 同上＋annaijo・daihonの記載 | 中 |
| .claude/skills/prworks-houkokusho/SKILL.md | 同上＋効果測定設計の記載 | 中 |
| clients/ダミー検証_A社_大豆ミート新商品/ | フェーズ0動作検証用の完全架空案件 | 実案件投入時に削除可 |

仮のprworks 5本は「最低基準＋差し替え警告」のみの骨組みです。実案件の成果物作成には使わないでください（各スキルの止める基準にもその旨を記載済み）。

## 2. 受領ファイルの配置マッピング（ファイル名ずれの記録）

受領時のファイル名はブラウザダウンロードの連番リネームで中身とずれていたため、中身ベースで同定して配置しました。

| 受領ファイル名 | 実際の中身 | 配置先 |
|---|---|---|
| CLAUDE.md | 統制の正本 | CLAUDE.md |
| README.md | 構成概要 | README.md |
| SETUP_GUIDE.md | 導入ガイド | SETUP_GUIDE.md |
| SKILL.md | /kprコマンド本体 | .claude/commands/kpr.md |
| pr-spotlights.md | settings.json（deny/ask） | .claude/settings.json |
| SKILL (2).md | KPR-Kikaku-Bunseki | .claude/skills/KPR-Kikaku-Bunseki/SKILL.md |
| SKILL (7).md | KPR-Kikakusho-Sakusei | .claude/skills/KPR-Kikakusho-Sakusei/SKILL.md |
| SKILL (5).md | PR SPOTLIGHTS正本 | .claude/skills/KPR-Kikakusho-Sakusei/reference/pr-spotlights.md |
| SKILL (6).md | 企画書テンプレート雛形 | .claude/skills/KPR-Kikakusho-Sakusei/reference/teiansho-template.md |
| SKILL (9).md | KPR-NewsValue-Kensho | .claude/skills/KPR-NewsValue-Kensho/SKILL.md |
| README (10).md | prworks-annaijo | .claude/skills/prworks-annaijo/SKILL.md |
| レビュー評価表.md | prworks-daihon | .claude/skills/prworks-daihon/SKILL.md |
| PR戦略プランナー_内容案_20260726.md | 設計ドラフト | docs/（参考資料として） |
| KPR-PRISM_PR戦略プランナー説明資料_20260726.pptx | 社内説明資料 | docs/（参考資料として） |

READMEは関連資料2点をルート想定で記載していますが、配布物と参考資料を分けるためdocs/に置いています（フェーズ1で扱いを確定）。

## 3. 参照整合チェック結果（手順0-3）

パッケージ内の相互参照を突合した結果、以下の不整合が見つかりました。フェーズ1以降で対処してください。

1. prworks-daihon が `kpr-oc-checklist`（オンライン配信の本番前チェック）を参照しているが、本パッケージに存在しない。10スキル構成の対象外。→ 対処案：参照を削除するか、フル版から該当スキルを移植するかをフェーズ1で決定
2. KPR-Kikakusho-Sakusei §1 が発信の3Sの定義元として `KPR-PR-Shisou` を参照しているが、本パッケージに存在しない。3Sの定義自体は kpr.md §1（らしさ8項目）に内蔵済み。→ 対処案：参照先を kpr.md §1 に書き換える（フェーズ1-1のらしさ正本一元化と同時に）
3. らしさ8項目の定義が kpr.md・CLAUDE.md・README・内容案に重複記載されている。→ フェーズ1-1で kpr.md を正本化し他は参照に置換（手順書どおり）
4. フル版参照パス `20260718検証/KPR-AgentOS/` は本リポジトリの `C:\claude code\KPR-AgentOS` と同一物か未確認。→ 谷さんに確認

## 4. フェーズ0完了確認

- ダミー案件（clients/ダミー検証_A社_大豆ミート新商品）で、brief.md→骨子_v1.md（10欄）の一本道フローを通し、テンプレートの全欄が埋まることを確認済み
- .claude/skills 配下のスキルがClaude Codeのスキル一覧に認識されることを確認済み
- 未実施：別セッションでパッケージフォルダを直接開いての /kpr コマンド起動確認（SETUP_GUIDEの再読込手順どおり、利用者環境での確認を推奨）
