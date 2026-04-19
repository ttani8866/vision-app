# Strength Vision の GitHub Pages デプロイ

## 前提

- 本リポジトリが GitHub 上に存在する
- デフォルトブランチが `master` または `main`（ワークフローは両方で起動）

## 初回のみ（GitHub 上の操作）

1. リポジトリの **Settings** → **Pages**
2. **Build and deployment** の **Source** を **GitHub Actions** に変更

## 公開 URL

プロジェクトサイトの場合:

`https://<あなたのユーザー名>.github.io/<リポジトリ名>/`

リポジトリ名が URL のパスと一致するよう、`vite build` 時に `VITE_BASE_PATH=/<リポジトリ名>/` を CI で渡しています。

ユーザー/組織のルートサイト（`<user>.github.io` だけで表示）に載せる場合は、ワークフローの `VITE_BASE_PATH` を `/` に変更し、専用リポジトリ構成に合わせてください。

## ローカルでのプッシュ例

リモート未設定の場合:

```bash
cd "/path/to/claude code"
git remote add origin https://github.com/<USER>/<REPO>.git
git branch -M main   # または master のまま
git push -u origin main
```

`master` を使う場合は `git push -u origin master`。

## 注意

- 静的ホスト上では `/api/messages` は存在しません。目標・画像プロンプトはフォールバック（雛形／テンプレ）で動作します。
- API を本番で使う場合は別途プロキシ（BFF）の URL を組み込む必要があります（要件定義参照）。
