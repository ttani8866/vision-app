"use client";

import { GENRES, type StoreInfo } from "@/lib/types";

const FIELDS: { key: keyof StoreInfo; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: "name", label: "店名", placeholder: "例）銀座 花明かり" },
  { key: "igHandle", label: "公式Instagram ID", placeholder: "例）@ginza_hanaakari" },
  { key: "address", label: "住所", placeholder: "例）東京都中央区銀座5-x-x" },
  { key: "stationWalk", label: "最寄駅と徒歩分数", placeholder: "例）銀座駅 徒歩3分" },
  { key: "phone", label: "電話番号", placeholder: "例）03-xxxx-xxxx" },
  { key: "hoursAndClosed", label: "営業時間・定休日", placeholder: "例）11:00-22:00（L.O.21:30）／月曜定休" },
  { key: "menu", label: "メニューと価格（税込）", placeholder: "例）ランチコース 3,300円〜", multiline: true },
  { key: "payment", label: "支払方法", placeholder: "例）現金・クレジットカード・電子マネー" },
  {
    key: "ginzaOnlyReason",
    label: "コメント",
    placeholder: "お店の魅力・推しポイントなどを自由に記入（2〜4行）",
    multiline: true,
  },
];

export default function StoreForm({
  store,
  onChange,
  onNext,
}: {
  store: StoreInfo;
  onChange: (next: StoreInfo) => void;
  onNext: () => void;
}) {
  const missing = FIELDS.filter((f) => !store[f.key]?.trim());
  const filled = missing.length === 0;

  return (
    <div className="space-y-4">
      <h2 className="font-display sparkle text-xl font-extrabold">店舗情報入力</h2>

      <div>
        <label className="label">ジャンル</label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ ...store, genre: g })}
              className={`chip ${store.genre === g ? "chip-on" : ""}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {FIELDS.map((f) => {
        const empty = !store[f.key]?.trim();
        return (
          <div key={f.key}>
            <label className="label">
              {f.label}
              {empty && (
                <span className="ml-1.5 rounded bg-[var(--marker)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink)]">
                  未入力
                </span>
              )}
            </label>
            {f.multiline ? (
              <textarea
                value={store[f.key]}
                onChange={(e) => onChange({ ...store, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                rows={3}
                className={`field ${empty ? "field-error" : ""}`}
              />
            ) : (
              <input
                value={store[f.key]}
                onChange={(e) => onChange({ ...store, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className={`field ${empty ? "field-error" : ""}`}
              />
            )}
          </div>
        );
      })}

      {!filled && (
        <p className="note-warn">
          未入力の項目があります: {missing.map((f) => f.label).join("、")}
        </p>
      )}

      <button type="button" onClick={onNext} disabled={!filled} className="btn-primary">
        キャプションを生成する
      </button>
    </div>
  );
}
