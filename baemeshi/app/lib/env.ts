// リポジトリルートの .env は next.config.mjs で読み込み済み（daily_report.py と共有）。
// ここでは型付きアクセサとしてまとめる。

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が .env に設定されていません（C:\\claude code\\.env を確認してください）`);
  }
  return value;
}

export const env = {
  get igUserToken() {
    return required("BAEMESHI_IG_USER_TOKEN");
  },
  get igAccountId() {
    return required("BAEMESHI_IG_ACCOUNT_ID");
  },
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  /** 広告アカウントID（例: act_598774024775324）。未設定なら改善案生成は投稿データのみで行う */
  adAccountId: process.env.BAEMESHI_META_AD_ACCOUNT_ID || "",
  graphApiVersion: process.env.BAEMESHI_GRAPH_API_VERSION || "v21.0",
  storageDriver: (process.env.BAEMESHI_STORAGE_DRIVER || "auto") as "auto" | "local" | "s3" | "blob",
  publicBaseUrl: process.env.BAEMESHI_PUBLIC_BASE_URL || "",
};
