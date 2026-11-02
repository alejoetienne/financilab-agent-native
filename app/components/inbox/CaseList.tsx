import { IconRobot } from "@tabler/icons-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  ActorTag,
  relativeTime,
  RiskBadge,
  SourceIcon,
  STATUS_LABEL,
  type Actor,
  type Source,
  type Status,
  type Verdict,
} from "./format";

export interface CaseListItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: Source;
  text: string;
  url: string | null;
  sender: string | null;
  riskScore: number | null;
  verdict: Verdict | null;
  status: Status;
  lastActor: Actor;
  lastAction: string | null;
}

export function CaseListSkeleton() {
  return (
    <div className="space-y-1.5 px-1">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-2 rounded-lg p-3">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function CaseList({
  cases,
  selectedId,
  onSelect,
}: {
  cases: CaseListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-0.5" aria-label="Cases">
      {cases.map((c) => {
        const selected = c.id === selectedId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected && "bg-accent",
              )}
            >
              <div className="flex items-center gap-2">
                <RiskBadge verdict={c.verdict} score={c.riskScore} />
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    c.status === "flagged"
                      ? "text-red-700 dark:text-red-400"
                      : c.status === "resolved"
                        ? "text-muted-foreground line-through decoration-muted-foreground/40"
                        : "text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[c.status]}
                </span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
                  {relativeTime(c.updatedAt)}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-foreground">
                {c.text || c.url}
              </p>
              <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                <SourceIcon source={c.source} />
                <span className="truncate">{c.sender ?? "Unknown sender"}</span>
                {c.lastAction ? (
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    {c.lastActor === "agent" ? (
                      <IconRobot className="size-3" strokeWidth={1.8} />
                    ) : null}
                    {c.lastAction}
                    <ActorTag actor={c.lastActor} />
                  </span>
                ) : null}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
