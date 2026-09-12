"use client";
import type { StoredPage } from "@/lib/db";

// 根拠のページ番号を押した時に該当ページ画像を開く（§6-5）
export default function PageViewer({ page, onClose }: { page: StoredPage; onClose: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            {page.pageNumber}ページ目 <small>（ページID: {page.pageId}）</small>
          </div>
          <button className="btn secondary" onClick={onClose}>閉じる</button>
        </div>
        <img src={page.image} alt={`${page.pageNumber}ページ目`} />
      </div>
    </div>
  );
}
