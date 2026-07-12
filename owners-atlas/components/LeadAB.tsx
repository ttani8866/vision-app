"use client";

import { useEffect, useState } from "react";
import { getVariant } from "@/lib/analytics";

// A/Bテスト対象のリード文。Cookie（oa_variant）で出し分けるClient Component。
// SSGと両立させるため、マウント後にバリアントを解決する。
export default function LeadAB({
  leadA,
  leadB,
}: {
  leadA: string;
  leadB: string;
}) {
  const [lead, setLead] = useState<string | null>(null);

  useEffect(() => {
    setLead(getVariant() === "b" ? leadB : leadA);
  }, [leadA, leadB]);

  return (
    <p className="text-lg leading-loose" style={{ minHeight: "8rem" }}>
      {lead && <span className="marker-highlight">{lead}</span>}
    </p>
  );
}
