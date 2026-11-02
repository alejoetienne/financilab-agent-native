import { cn } from "@/lib/utils";

import { riskTone, type Verdict } from "./format";

/** Semicircular 0-100 risk gauge. */
export function RiskGauge({
  score,
  verdict,
}: {
  score: number | null;
  verdict: Verdict | null;
}) {
  const tone = riskTone(verdict);
  const value = Math.max(0, Math.min(100, score ?? 0));
  // Arc from (10,60) to (110,60), radius 50 → length π·50.
  const length = Math.PI * 50;
  return (
    <div className="relative h-[76px] w-[132px] shrink-0" aria-label={`Risk score ${score ?? "not analyzed"} of 100`} role="img">
      <svg viewBox="0 0 120 70" className="h-full w-full">
        <path
          d="M10 62 A50 50 0 0 1 110 62"
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          className="stroke-muted"
        />
        {score !== null && value > 0 ? (
          <path
            d="M10 62 A50 50 0 0 1 110 62"
            fill="none"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${(value / 100) * length} ${length}`}
            className={cn(tone.stroke, "transition-[stroke-dasharray] duration-500")}
          />
        ) : null}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center leading-none">
        <span className={cn("text-2xl font-semibold tabular-nums", tone.text)}>
          {score ?? "—"}
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          risk / 100
        </span>
      </div>
    </div>
  );
}
