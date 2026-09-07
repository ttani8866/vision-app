"use client";

export default function ConfirmModal({
  storeName,
  warnLessThan24h,
  onCancel,
  onConfirm,
  submitting,
}: {
  storeName: string;
  warnLessThan24h: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(58,46,38,0.55)] backdrop-blur-[2px] sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-[var(--paper)] p-5 pb-7 sm:rounded-3xl sm:pb-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--hairline)] sm:hidden" />
        <h3 className="font-display text-lg font-extrabold">Instagramに投稿しますか？</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
          「{storeName}」の投稿を @baemeshi_official に公開します。この操作は取り消せません。
        </p>
        {warnLessThan24h && (
          <p className="note-warn mt-3">
            前回投稿から24時間経過していません。投稿は可能ですが、間隔にご注意ください。
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} disabled={submitting} className="btn-secondary flex-1">
            キャンセル
          </button>
          <button type="button" onClick={onConfirm} disabled={submitting} className="btn-primary flex-1">
            {submitting ? "投稿中…" : "投稿する"}
          </button>
        </div>
      </div>
    </div>
  );
}
