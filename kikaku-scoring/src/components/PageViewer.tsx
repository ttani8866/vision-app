"use client";
import type { StoredPage } from "@/lib/db";

// 根拠のページ番号を押した時に該当ページ画像を開く（§6-5）
export default function PageViewer({ page, onClose }: { page: StoredPage; onClose: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)" }}>
            {page.pageNumber}ページ目 <span className="mono" style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>（ページID: {page.pageId}）</span>
          </div>
          <button className="btn secondary" onClick={onClose}>閉じる</button>
        </div>
        <img src={page.image} alt={`${page.pageNumber}ページ目`} />
      </div>
    </div>
  );
}
