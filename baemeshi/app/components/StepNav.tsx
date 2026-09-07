"use client";

export default function StepNav({
  steps,
  current,
}: {
  steps: { key: string; label: string }[];
  current: string;
}) {
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol className="mb-6 flex items-start">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={s.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className={`h-0.5 flex-1 ${i === 0 ? "invisible" : ""} ${
                  i <= currentIndex ? "bg-[var(--grad-b)]" : "bg-[var(--hairline)]"
                }`}
              />
              <div
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold transition-all ${
                  active
                    ? "text-white shadow-[0_3px_10px_rgba(255,122,26,0.4)]"
                    : done
                      ? "bg-[var(--bowl-red)] text-white"
                      : "border-2 border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-soft)]"
                }`}
                style={
                  active
                    ? { background: "linear-gradient(120deg, var(--grad-a), var(--grad-b) 60%, var(--grad-c))" }
                    : undefined
                }
              >
                {done ? "✓" : i + 1}
              </div>
              <div
                className={`h-0.5 flex-1 ${i === steps.length - 1 ? "invisible" : ""} ${
                  i < currentIndex ? "bg-[var(--grad-b)]" : "bg-[var(--hairline)]"
                }`}
              />
            </div>
            <span
              className={`mt-1 text-[10px] font-bold leading-tight ${
                active ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"
              }`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
