"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import StepNav from "@/components/StepNav";
import UploadStep from "@/components/UploadStep";
import StoreForm from "@/components/StoreForm";
import ThumbnailStep from "@/components/ThumbnailStep";
import CaptionStep from "@/components/CaptionStep";
import PreviewStep from "@/components/PreviewStep";
import { EMPTY_STORE, GENRES, resolvePostTarget, type StoreInfo, type UploadedMedia } from "@/lib/types";
import type { ProposalRow } from "@/lib/db";

type Step = "upload" | "form" | "thumbnail" | "caption" | "preview";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "素材" },
  { key: "form", label: "店舗情報" },
  { key: "thumbnail", label: "サムネ" },
  { key: "caption", label: "キャプション" },
  { key: "preview", label: "プレビュー" },
];

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [singleVideoAs, setSingleVideoAs] = useState<"reel" | "feed_video">("reel");
  const [store, setStore] = useState<StoreInfo>(EMPTY_STORE);
  const [caption, setCaption] = useState("");
  const [proposal, setProposal] = useState<ProposalRow | null>(null);

  const target = resolvePostTarget(media, singleVideoAs);

  // /?proposal=ID で開かれたら、改善案のジャンルをプリセットし、狙いをキャプション生成に引き継ぐ
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("proposal"));
    if (!id) return;
    fetch(`/api/proposals?id=${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok || !j.item) return;
        const p = j.item as ProposalRow;
        setProposal(p);
        if ((GENRES as string[]).includes(p.genre)) {
          setStore((prev) => ({ ...prev, genre: p.genre as StoreInfo["genre"] }));
        }
      })
      .catch(() => {});
  }, []);

  const direction = proposal ? `${proposal.hook}\n撮り方の指示: ${proposal.shoot}` : undefined;

  function reset() {
    setStep("upload");
    setMedia([]);
    setSingleVideoAs("reel");
    setStore(EMPTY_STORE);
    setCaption("");
    setProposal(null);
    if (window.location.search) window.history.replaceState(null, "", "/");
  }

  return (
    <>
      <AppHeader
        links={[
          { href: "/proposals", label: "改善案" },
          { href: "/history", label: "投稿履歴" },
        ]}
      />
      <main className="mx-auto max-w-md px-4 pb-16 pt-5">
        {proposal && (
          <div className="card mb-4 p-3.5">
            <p className="text-xs font-bold text-[var(--ink-soft)]">改善案から作成中</p>
            <p className="font-display mt-0.5 text-base font-extrabold leading-snug">{proposal.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed">
              <span className="font-bold">切り口:</span> {proposal.hook}
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              <span className="font-bold">撮り方:</span> {proposal.shoot}
            </p>
            <Link href="/proposals" className="mt-1.5 inline-block text-xs text-[var(--ink-soft)] underline underline-offset-2">
              改善案一覧に戻る
            </Link>
          </div>
        )}

        <StepNav steps={STEPS} current={step} />

        {step === "upload" && (
          <div className="space-y-4">
            <UploadStep
              media={media}
              onChange={setMedia}
              singleVideoAs={singleVideoAs}
              onChangeSingleVideoAs={setSingleVideoAs}
            />
            <button type="button" onClick={() => setStep("form")} disabled={media.length === 0} className="btn-primary">
              次へ（店舗情報入力）
            </button>
          </div>
        )}

        {step === "form" && (
          <StoreForm store={store} onChange={setStore} onNext={() => setStep("thumbnail")} />
        )}

        {step === "thumbnail" && (
          <ThumbnailStep media={media} store={store} onChange={setMedia} onNext={() => setStep("caption")} />
        )}

        {step === "caption" && (
          <CaptionStep
            store={store}
            caption={caption}
            direction={direction}
            onChangeCaption={setCaption}
            onNext={() => setStep("preview")}
          />
        )}

        {step === "preview" && media.length > 0 && target && (
          <div className="space-y-4">
            <PreviewStep
              media={media}
              target={target}
              caption={caption}
              storeName={store.name}
              proposalId={proposal?.id ?? null}
              onPosted={() => {}}
            />
            <button
              type="button"
              onClick={reset}
              className="w-full text-center text-sm font-medium text-[var(--ink-soft)] underline underline-offset-4"
            >
              最初からやり直す
            </button>
          </div>
        )}
      </main>
    </>
  );
}
