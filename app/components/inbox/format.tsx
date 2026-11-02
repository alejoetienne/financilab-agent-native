import {
  IconBrandWhatsapp,
  IconLink,
  IconMail,
  IconMessage,
  IconQuestionMark,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export type Verdict = "safe" | "suspicious" | "scam";
export type Status = "new" | "analyzed" | "flagged" | "resolved";
export type Source = "sms" | "whatsapp" | "email" | "link" | "other";
export type Actor = "user" | "agent";

export const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  analyzed: "Analyzed",
  flagged: "Flagged",
  resolved: "Resolved",
};

export const SOURCE_LABEL: Record<Source, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email",
  link: "Link",
  other: "Other",
};

export function SourceIcon({
  source,
  className,
}: {
  source: Source;
  className?: string;
}) {
  const Icon =
    source === "whatsapp"
      ? IconBrandWhatsapp
      : source === "email"
        ? IconMail
        : source === "link"
          ? IconLink
          : source === "sms"
            ? IconMessage
            : IconQuestionMark;
  return <Icon className={cn("size-3.5 shrink-0", className)} strokeWidth={1.8} />;
}

/** Semantic risk colours shared by the badge and the gauge. */
export function riskTone(verdict: Verdict | null | undefined) {
  switch (verdict) {
    case "scam":
      return {
        text: "text-red-700 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950/40",
        ring: "ring-red-200 dark:ring-red-900",
        stroke: "stroke-red-500",
        label: "Scam",
      };
    case "suspicious":
      return {
        text: "text-amber-700 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/40",
        ring: "ring-amber-200 dark:ring-amber-900",
        stroke: "stroke-amber-500",
        label: "Suspicious",
      };
    case "safe":
      return {
        text: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        ring: "ring-emerald-200 dark:ring-emerald-900",
        stroke: "stroke-emerald-500",
        label: "Likely safe",
      };
    default:
      return {
        text: "text-muted-foreground",
        bg: "bg-muted",
        ring: "ring-border",
        stroke: "stroke-muted-foreground",
        label: "Not analyzed",
      };
  }
}

export function RiskBadge({
  verdict,
  score,
  className,
}: {
  verdict: Verdict | null | undefined;
  score: number | null | undefined;
  className?: string;
}) {
  const tone = riskTone(verdict);
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium ring-1 ring-inset tabular-nums",
        tone.text,
        tone.bg,
        tone.ring,
        className,
      )}
    >
      {score !== null && score !== undefined ? <span>{score}</span> : null}
      <span className={score !== null && score !== undefined ? "opacity-80" : ""}>
        {tone.label}
      </span>
    </span>
  );
}

export function ActorTag({ actor }: { actor: Actor }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1 text-[11px] font-medium",
        actor === "agent"
          ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
          : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
      )}
    >
      {actor === "agent" ? "by agent" : "by you"}
    </span>
  );
}

const rtf =
  typeof Intl !== "undefined"
    ? new Intl.RelativeTimeFormat("en", { numeric: "auto" })
    : null;

export function relativeTime(iso: string, now = Date.now()) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms) || !rtf) return "";
  const diff = Math.round((ms - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}
