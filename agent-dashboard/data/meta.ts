/* 画面に出す更新情報。
   本アプリは外部データを取得していないため、原設計の「最終更新」という
   表現は実態と合わない。データファイルを最後に更新した時点を示す文言に
   変え、静的である旨を併記している。実データ接続時にここを差し替える。 */
export const DATA_UPDATED_AT = "2026/08/22 08:00";
export const DATA_SOURCE_NOTE = "静的";

/* Discord連携は未実装。ボタンは押せるが送信は行わない。 */
export const DISCORD_TOAST = "Discord連携は未接続です（画面表示のみ）";
