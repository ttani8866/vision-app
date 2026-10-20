type Props = {
  /** 右端に出す短い状況表示。例: "正解 2 / 回答済 3問"（省略可） */
  status?: string;
};

export function AppHeader({ status }: Props) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-line bg-white px-4 sm:px-6">
      <div
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[13px] font-bold text-white"
      >
        AI
      </div>
      <div className="text-sm font-bold text-ink">AIチューター確認テスト</div>
      {status ? (
        <div className="ml-auto hidden text-xs text-muted sm:block">{status}</div>
      ) : null}
    </header>
  );
}
