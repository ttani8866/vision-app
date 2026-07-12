import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "Owner's AtlasにおけるGA4計測、Cookie、localStorageの利用について説明します。",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: 720 }}>
      <header className="pt-10 sm:pt-14">
        <p className="font-fraunces italic text-sm tracking-wide">Privacy Policy</p>
        <h1 className="mt-2 font-mincho text-3xl font-bold sm:text-4xl">
          プライバシーポリシー
        </h1>
      </header>

      <section className="mt-10" aria-label="計測について">
        <h2 className="border-b-[1.5px] border-ink pb-2 font-mincho text-xl font-bold">
          アクセス解析（Google Analytics 4）
        </h2>
        <p className="mt-4 leading-loose">
          本サイトは大学研究の一環として、Google Analytics
          4を用いた匿名の閲覧統計を取得します。計測は、Cookie同意バナーで同意いただいた場合にのみ開始されます。取得するのはページ閲覧、シェアボタンのクリック、公式サイトへのリンククリック、スクロール到達、渡航印の押印などの行動イベントで、氏名・メールアドレス等の個人を特定する情報は収集しません。
        </p>
      </section>

      <section className="mt-10" aria-label="Cookieについて">
        <h2 className="border-b-[1.5px] border-ink pb-2 font-mincho text-xl font-bold">
          Cookieの利用
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            oa_variant:
            リード文の表示テスト（A/Bテスト）のため、訪問者を2群にランダムに振り分ける識別子です。有効期限は90日です。本文・データ・URLは両群で完全に同一です。
          </li>
          <li>
            Google Analyticsが発行するCookie: 同意後の計測に用いられます。
          </li>
        </ul>
      </section>

      <section className="mt-10 pb-4" aria-label="localStorageについて">
        <h2 className="border-b-[1.5px] border-ink pb-2 font-mincho text-xl font-bold">
          localStorage（渡航印・旅の記録）
        </h2>
        <p className="mt-4 leading-loose">
          渡航印やルート踏破の記録は、お使いのブラウザのlocalStorageにのみ保存されます。サーバーには送信されず、会員登録も不要です。ブラウザのデータを消去すると記録も消えます。計測に同意いただいている場合、押印数などの統計値のみ匿名イベントとして送信されることがあります。
        </p>
      </section>
    </div>
  );
}
