# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

## AIチューター認定試験（v2 デザイン）

Vite + React + Tailwind CSS v4。出題・採点ロジックは変更なし。見た目は `src/App.jsx` の「見た目（v2）」以下と `src/index.css` のトークンで制御。
ブランド色は `src/index.css` の `--color-brand`（#FC6044、新東通信ロゴ由来）。

### 開発

```
npm ci
npm run dev
```

### Vercel へのデプロイ（初回のみ）

1. https://vercel.com/new で GitHub リポジトリ `ttani8866/vision-app` を Import
2. Root Directory を `ai-tutor-quiz` に設定（Edit から選択）
3. Framework Preset は Vite が自動検出される。Build Command `npm run build`、Output `dist`（vercel.json に記載済み）
4. Production Branch を公開したいブランチ（`main`、または `claude/wizardly-cray-1ff1f7`）に設定して Deploy

以後は対象ブランチへの push で自動デプロイされます。
