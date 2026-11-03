import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import {
  IconArrowLeft,
  IconBulb,
  IconCircleCheck,
  IconCopy,
  IconFlag,
  IconLanguage,
  IconMessageReply,
  IconRefresh,
  IconRobot,
  IconSparkles,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAskAgent } from "@/lib/ask-agent";
import { cn } from "@/lib/utils";

import {
  ActorTag,
  relativeTime,
  riskTone,
  SourceIcon,
  SOURCE_LABEL,
  STATUS_LABEL,
  type Status,
} from "./format";
import { RiskGauge } from "./RiskGauge";

type Lang = "es" | "en";

/** Optimistically patch a case everywhere it is cached (list + detail). */
function usePatchCaseCache() {
  const qc = useQueryClient();
  return (id: string, patch: Record<string, unknown>) => {
    const snapshot = qc.getQueriesData({
      predicate: (q) =>
        q.queryKey[0] === "action" &&
        (q.queryKey[1] === "list-cases" || q.queryKey[1] === "get-case"),
    });
    qc.setQueriesData(
      {
        predicate: (q) =>
          q.queryKey[0] === "action" && q.queryKey[1] === "list-cases",
      },
      (old: unknown) => {
        const data = old as { cases?: { id: string }[] } | undefined;
        if (!data?.cases) return old;
        return {
          ...data,
          cases: data.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        };
      },
    );
    qc.setQueriesData(
      {
        predicate: (q) =>
          q.queryKey[0] === "action" && q.queryKey[1] === "get-case",
      },
      (old: unknown) => {
        const data = old as { id?: string } | undefined;
        return data?.id === id ? { ...data, ...patch } : old;
      },
    );
    return () => {
      for (const [key, value] of snapshot) qc.setQueryData(key, value);
    };
  };
}

export function CaseDetailSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <div className="flex gap-5">
        <Skeleton className="h-[76px] w-[132px] rounded-xl" />
        <div className="flex-1 space-y-2 pt-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export function CaseDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const [confirm, setConfirm] = useState<"flag" | "resolve" | null>(null);
  const [notes, setNotes] = useState("");
  const patchCache = usePatchCaseCache();
  const { data, isPending, error } = useActionQuery("get-case", { id });
  const { ask, pending: asking } = useAskAgent();

  const onFail = (fallback: string) => (err: Error, _v: unknown, ctx: unknown) => {
    (ctx as (() => void) | undefined)?.();
    toast.error(actionErrorMessage(err) ?? fallback);
  };

  const analyze = useActionMutation("analyze-case", {
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Analysis failed."),
    onSuccess: (r) => toast.success(`Analyzed: ${r.riskScore}/100 · ${r.verdict}`),
  });
  const explain = useActionMutation("explain-case", {
    onSuccess: (r) => {
      setLang(r.lang);
      toast.success(r.lang === "es" ? "Explicación en español" : "Explanation in English");
    },
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not explain."),
  });
  const flag = useActionMutation("flag-case", {
    onMutate: (v: { id: string }) => patchCache(v.id, { status: "flagged", flaggedBy: "user", lastActor: "user", lastAction: "flagged" }),
    onError: onFail("Could not flag the case."),
    onSuccess: () => toast.success("Case flagged"),
  });
  const resolve = useActionMutation("resolve-case", {
    onMutate: (v: { id: string }) => patchCache(v.id, { status: "resolved", lastActor: "user", lastAction: "resolved" }),
    onError: onFail("Could not resolve the case."),
    onSuccess: () => toast.success("Case resolved"),
  });
  const reply = useActionMutation("draft-safe-reply", {
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not draft a reply."),
  });
  const tip = useActionMutation("education-tip", {
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not get a tip."),
  });
  const [tipVariant, setTipVariant] = useState(0);

  if (isPending) return <CaseDetailSkeleton />;
  if (error || !data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {actionErrorMessage(error) ?? "Case not found."}
        <Button variant="link" className="px-1" onClick={onBack}>
          Back to inbox
        </Button>
      </div>
    );
  }

  const c = data;
  const tone = riskTone(c.verdict);
  const analyzed = c.riskScore !== null;
  const closed = c.status === "resolved";
  const explanation = lang === "es" ? c.explanationEs : c.explanationEn;
  const advice = lang === "es" ? c.adviceEs : c.adviceEn;
  const category = lang === "es" ? c.categoryLabelEs : c.categoryLabelEn;
  const reasons = c.signals.filter((s) => s.weight !== 0 || s.id.startsWith("llm_"));

  function askAgent() {
    void ask({
      message:
        lang === "es"
          ? "Revisa este caso: explícame el riesgo y qué debo hacer. Si es estafa, márcalo y prepara una respuesta segura y un consejo."
          : "Review this case: explain the risk and what I should do. If it is a scam, flag it and draft a safe reply and a tip.",
      context: JSON.stringify({ caseId: c.id }),
    });
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="-ml-2 h-7 px-2 text-xs lg:hidden" onClick={onBack}>
        <IconArrowLeft className="size-3.5" /> Inbox
      </Button>

      {/* Verdict header */}
      <section className="flex flex-wrap items-center gap-5">
        <RiskGauge score={c.riskScore} verdict={c.verdict} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={cn("text-lg font-semibold tracking-tight", tone.text)}>
              {tone.label}
            </h2>
            {category && c.category !== "none" ? (
              <span className="text-sm text-muted-foreground">· {category}</span>
            ) : null}
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{STATUS_LABEL[c.status as Status]}</span>
            {c.status === "flagged" && c.flaggedBy ? <ActorTag actor={c.flaggedBy} /> : null}
            <span>·</span>
            <span>Updated {relativeTime(c.updatedAt)}</span>
            {c.lastAction ? (
              <>
                <span>·</span>
                <span>{c.lastAction}</span>
                <ActorTag actor={c.lastActor} />
              </>
            ) : null}
            {analyzed ? (
              <>
                <span>·</span>
                <span>{c.llmUsed ? "Rules + LLM" : "Offline rules"}</span>
              </>
            ) : null}
          </p>
        </div>
      </section>

      {/* Original message */}
      <section className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <SourceIcon source={c.source} />
          <span>{SOURCE_LABEL[c.source]}</span>
          <span>·</span>
          <span className="truncate">{c.sender ?? "Unknown sender"}</span>
          <span className="ml-auto">{new Date(c.createdAt).toLocaleString("en")}</span>
        </div>
        {c.text ? (
          <p lang="es" className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {c.text}
          </p>
        ) : null}
        {c.url ? (
          <p className="mt-2 break-all font-mono text-xs text-red-700 dark:text-red-400">
            {c.url}
            <span className="ml-2 font-sans text-muted-foreground">(not a clickable link)</span>
          </p>
        ) : null}
      </section>

      {/* Actions */}
      <section className="flex flex-wrap gap-2" aria-label="Case actions">
        <Button size="sm" variant={analyzed ? "outline" : "default"} disabled={analyze.isPending} onClick={() => analyze.mutate({ id: c.id })}>
          <IconRefresh className={cn("size-4", analyze.isPending && "animate-spin")} />
          {analyze.isPending ? "Analyzing…" : analyzed ? "Re-analyze" : "Analyze"}
        </Button>
        <Button size="sm" variant="outline" disabled={explain.isPending} onClick={() => explain.mutate({ id: c.id, lang: lang === "en" ? "es" : "en" })}>
          <IconLanguage className="size-4" />
          {explain.isPending ? "Explaining…" : lang === "en" ? "Explain in Spanish" : "Explain in English"}
        </Button>
        <Button size="sm" variant="outline" disabled={closed || c.status === "flagged" || flag.isPending} onClick={() => { setNotes(""); setConfirm("flag"); }}>
          <IconFlag className="size-4" />
          {c.status === "flagged" ? "Flagged" : "Flag"}
        </Button>
        <Button size="sm" variant="outline" disabled={reply.isPending} onClick={() => reply.mutate({ id: c.id, lang })}>
          <IconMessageReply className="size-4" />
          {reply.isPending ? "Drafting…" : "Safe reply"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={tip.isPending}
          onClick={() => {
            tip.mutate({ id: c.id, lang, variant: tipVariant });
            setTipVariant((v) => v + 1);
          }}
        >
          <IconBulb className="size-4" />
          {tip.isPending ? "Picking…" : "Education tip"}
        </Button>
        <Button size="sm" variant="outline" disabled={closed || resolve.isPending} onClick={() => { setNotes(""); setConfirm("resolve"); }}>
          <IconCircleCheck className="size-4" />
          {closed ? "Resolved" : "Resolve"}
        </Button>
        <Button size="sm" variant="ghost" onClick={askAgent} disabled={asking} aria-busy={asking} className="text-violet-700 hover:text-violet-800 dark:text-violet-300">
          <IconSparkles className="size-4" />
          Ask agent
        </Button>
      </section>

      {/* Explanation & reasons */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Why</h3>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={lang}
            onValueChange={(v) => v && setLang(v as Lang)}
            aria-label="Explanation language"
          >
            <ToggleGroupItem value="en" className="h-7 px-2.5 text-xs">EN</ToggleGroupItem>
            <ToggleGroupItem value="es" className="h-7 px-2.5 text-xs">ES</ToggleGroupItem>
          </ToggleGroup>
        </div>
        {analyzed ? (
          <>
            <p lang={lang} className="text-sm leading-relaxed">{explanation}</p>
            {advice ? (
              <p lang={lang} className={cn("rounded-lg px-3 py-2 text-sm", tone.bg, tone.text)}>
                {advice}
              </p>
            ) : null}
            {reasons.length ? (
              <ul className="space-y-1.5">
                {reasons.map((s) => (
                  <li key={s.id} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-5 min-w-9 shrink-0 items-center justify-center rounded text-[11px] font-medium tabular-nums",
                        s.weight > 0
                          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          : s.weight < 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
                      )}
                      title={s.id}
                    >
                      {s.weight > 0 ? `+${s.weight}` : s.weight < 0 ? s.weight : "AI"}
                    </span>
                    <span lang={lang} className="leading-snug">
                      {lang === "es" ? s.reasonEs : s.reasonEn}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No risk signals found.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not analyzed yet. Run <strong>Analyze</strong> or ask the agent to triage the inbox.
          </p>
        )}
      </section>

      {/* Reply + tip */}
      {c.safeReply || c.tip ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {c.safeReply ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-sm font-medium">
                  <IconMessageReply className="size-4 text-muted-foreground" /> Safe reply
                </h3>
                <Button variant="ghost" size="icon" className="size-7" aria-label="Copy safe reply" onClick={() => copy(c.safeReply!)}>
                  <IconCopy className="size-3.5" />
                </Button>
              </div>
              <p className="text-sm leading-relaxed">{c.safeReply}</p>
              <p className="mt-2 text-xs text-muted-foreground">Ignoring and blocking the sender is always fine too.</p>
            </div>
          ) : null}
          {c.tip ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <IconBulb className="size-4 text-muted-foreground" /> Tip
              </h3>
              <p className="text-sm leading-relaxed">{c.tip}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {c.notes ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-medium">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{c.notes}</p>
        </section>
      ) : null}

      {/* Activity */}
      <section>
        <h3 className="mb-2 text-sm font-medium">Activity</h3>
        <ol className="space-y-0 border-l border-border pl-4">
          {c.events.map((ev) => (
            <li key={ev.id} className="relative pb-3 text-sm">
              <span
                className={cn(
                  "absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-2 ring-background",
                  ev.actor === "agent" ? "bg-violet-500" : "bg-sky-500",
                )}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {ev.actor === "agent" ? <IconRobot className="size-3.5 text-violet-600" strokeWidth={1.8} /> : null}
                <span className="inline-block font-medium first-letter:uppercase">{ev.action}</span>
                <ActorTag actor={ev.actor} />
                <span className="text-xs text-muted-foreground">{relativeTime(ev.createdAt)}</span>
              </div>
              {ev.detail ? <p className="mt-0.5 text-xs text-muted-foreground">{ev.detail}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "flag" ? "Flag this case?" : "Resolve this case?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "flag"
                ? "Marks it as a scam that needs attention. The agent will see it was flagged by you."
                : "Closes the case. It stays in the inbox under Resolved."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note (e.g. sender blocked, bank notified)"
            className="min-h-16 text-sm"
            maxLength={2000}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const payload = { id: c.id, notes: notes.trim() || undefined };
                if (confirm === "flag") flag.mutate(payload);
                else resolve.mutate(payload);
              }}
            >
              {confirm === "flag" ? "Flag case" : "Resolve case"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
