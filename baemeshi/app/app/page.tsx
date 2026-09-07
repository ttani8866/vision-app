"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import StepNav from "@/components/StepNav";
import UploadStep from "@/components/UploadStep";
import StoreForm from "@/components/StoreForm";
import ThumbnailStep from "@/components/ThumbnailStep";
import CaptionStep from "@/components/CaptionStep";
import PreviewStep from "@/components/PreviewStep";
import { EMPTY_STORE, resolvePostTarget, type StoreInfo, type UploadedMedia } from "@/lib/types";

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

  const target = resolvePostTarget(media, singleVideoAs);

  function reset() {
    setStep("upload");
    setMedia([]);
    setSingleVideoAs("reel");
    setStore(EMPTY_STORE);
    setCaption("");
  }

  return (
    <>
      <AppHeader rightHref="/history" rightLabel="投稿履歴" />
      <main className="mx-auto max-w-md px-4 pb-16 pt-5">
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
            onChangeCaption={setCaption}
            onNext={() => setStep("preview")}
          />
        )}

        {step === "preview" && media.length > 0 && target && (
          <div className="space-y-4">
            <PreviewStep media={media} target={target} caption={caption} storeName={store.name} onPosted={() => {}} />
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
