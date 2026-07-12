// OGP画像（Satori）用の日本語フォント取得ヘルパー。
// css2 API に text を渡し、使用グリフのみのサブセットTTFを取得する。

export async function loadJapaneseFont(
  text: string
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`;
    const css = await (
      await fetch(url, { headers: { "User-Agent": "Mozilla/4.0" } })
    ).text();
    const match = css.match(
      /src:\s*url\((.+?)\)\s*format\(['"](?:opentype|truetype)['"]\)/
    );
    if (!match) return null;
    const res = await fetch(match[1]);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
