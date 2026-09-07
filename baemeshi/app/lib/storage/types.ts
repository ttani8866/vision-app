export interface UploadResult {
  url: string;
  key: string;
  mimeType: string;
  sizeBytes: number;
}

export interface Storage {
  /** ファイルを保存し、公開URL（Instagram APIが取得できるURL）を返す */
  upload(file: Buffer, opts: { filename: string; mimeType: string }): Promise<UploadResult>;
}
