import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import {
  IconDatabaseImport,
  IconInbox,
  IconSearch,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react";
import { useDeferredValue, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { AddCaseForm } from "@/components/inbox/AddCaseForm";
import {
  CaseDetail,
  CaseDetailSkeleton,
} from "@/components/inbox/CaseDetail";
import {
  CaseList,
  CaseListSkeleton,
} from "@/components/inbox/CaseList";
import { STATUS_LABEL, type Status } from "@/components/inbox/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function meta() {
  return [
    { title: "Case inbox · FinanciLab Scam Shield" },
    {
      name: "description",
      content:
        "Shared inbox where you and the agent triage suspicious SMS, WhatsApp messages, emails and links.",
    },
  ];
}

const FILTERS: (Status | "all")[] = ["all", "new", "analyzed", "flagged", "resolved"];

export default function InboxRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("case");
  const statusParam = searchParams.get("status");
  const status = (FILTERS as string[]).includes(statusParam ?? "")
    ? (statusParam as Status | "all")
    : "all";
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const params = {
    ...(status !== "all" ? { status } : {}),
    ...(deferredQuery ? { query: deferredQuery } : {}),
  };
  const list = useActionQuery("list-cases", params, {
    placeholderData: (prev) => prev,
  });

  const seed = useActionMutation("seed-demo", {
    onSuccess: (r) =>
      toast.success(
        r.created
          ? `Loaded ${r.created} demo case${r.created === 1 ? "" : "s"}`
          : "Demo cases are already in the inbox",
      ),
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not load demo cases."),
  });

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    // Selecting a case pushes history; changing filters replaces it.
    setSearchParams(sp, { replace: !("case" in next) });
  }

  function triage() {
    sendToAgentChat({
      message:
        "Triage the case inbox: analyze every new case, flag the scams, and draft a safe reply and an education tip for each flagged case. Then summarize what you did.",
      submit: true,
      openSidebar: true,
    });
  }

  const cases = list.data?.cases ?? [];
  const counts = list.data?.counts;
  const empty = !list.isPending && counts?.all === 0;

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* Left: add + list */}
      <aside
        className={cn(
          "flex min-h-0 w-full flex-col border-border lg:w-[400px] lg:shrink-0 lg:border-r",
          selectedId && "hidden lg:flex",
        )}
      >
        <div className="space-y-3 p-3">
          <AddCaseForm onAdded={(id) => update({ case: id })} />
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search cases"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search text, link or sender"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={triage}
              title="Ask the agent to triage the inbox"
            >
              <IconSparkles className="size-3.5" />
              Triage with agent
            </Button>
          </div>
          <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1">
            {FILTERS.map((f) => {
              const active = f === status;
              const n = counts ? counts[f] : undefined;
              return (
                <button
                  key={f}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => update({ status: f === "all" ? null : f })}
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {f === "all" ? "All" : STATUS_LABEL[f]}
                  {n !== undefined ? (
                    <span className={cn("tabular-nums", active ? "opacity-80" : "opacity-70")}>{n}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {list.isPending ? (
            <CaseListSkeleton />
          ) : empty ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <IconInbox className="size-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-medium">No cases yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Paste a suspicious message above, or load six synthetic examples from Nicaragua.
              </p>
              <Button size="sm" className="mt-4" disabled={seed.isPending} onClick={() => seed.mutate({})}>
                <IconDatabaseImport className="size-4" />
                {seed.isPending ? "Loading…" : "Load demo cases"}
              </Button>
            </div>
          ) : cases.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">No cases match.</p>
          ) : (
            <>
              <CaseList cases={cases} selectedId={selectedId} onSelect={(id) => update({ case: id })} />
              <div className="px-3 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs text-muted-foreground"
                  disabled={seed.isPending}
                  onClick={() => seed.mutate({})}
                >
                  <IconDatabaseImport className="size-3.5" />
                  {seed.isPending ? "Loading…" : "Load demo cases"}
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Right: detail */}
      <section className={cn("min-h-0 flex-1 overflow-y-auto", !selectedId && "hidden lg:block")}>
        {selectedId ? (
          <CaseDetail key={selectedId} id={selectedId} onBack={() => update({ case: null })} />
        ) : list.isPending ? (
          <CaseDetailSkeleton />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <IconShieldCheck className="size-10 text-muted-foreground" strokeWidth={1.4} />
            <p className="mt-3 text-sm font-medium">Select a case</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              You and the agent work on the same cases. Everything either of you does is recorded as
              “by you” or “by agent”.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
