import type { Storage, UploadResult } from "./types";

// S3切り替え用のプレースホルダ。
// 導入時は @aws-sdk/client-s3 で PutObjectCommand を実行し、
// presigned URL または公開バケットURLを返す実装に置き換える。
// BAEMESHI_STORAGE_DRIVER=s3 と S3関連の環境変数（bucket名・region・認証情報）を .env に追加すること。
export class S3Storage implements Storage {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async upload(file: Buffer, opts: { filename: string; mimeType: string }): Promise<UploadResult> {
    throw new Error("S3Storage は未実装です。BAEMESHI_STORAGE_DRIVER=local を使用してください。");
  }
}
