import {
  actionErrorMessage,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import { IconPlus, IconShieldSearch } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { SOURCE_LABEL, type Source } from "./format";

const URL_ONLY = /^\s*(https?:\/\/|www\.)\S+\s*$/i;

/** Paste box: add a suspicious message or link and analyze it right away. */
export function AddCaseForm({ onAdded }: { onAdded: (id: string) => void }) {
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [source, setSource] = useState<Source>("sms");
  const [showDetails, setShowDetails] = useState(false);

  const add = useActionMutation("add-case", {
    onSuccess: (saved) => {
      setText("");
      setSender("");
      onAdded(saved.id);
      toast.success(
        saved.verdict
          ? `Analyzed: ${saved.riskScore}/100 · ${saved.verdict}`
          : "Case added",
      );
    },
    onError: (error) =>
      toast.error(actionErrorMessage(error) ?? "Could not add the case."),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    const isUrl = URL_ONLY.test(value);
    add.mutate({
      text: isUrl ? "" : value,
      url: isUrl ? value : undefined,
      sender: sender.trim() || undefined,
      source: isUrl && source === "sms" ? "link" : source,
      analyze: true,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-card p-3 shadow-xs"
    >
      <label htmlFor="case-text" className="sr-only">
        Suspicious message or link
      </label>
      <Textarea
        id="case-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
        }}
        placeholder="Paste a suspicious SMS, WhatsApp message, email or link…"
        className="min-h-20 resize-none border-0 bg-transparent p-1 text-sm shadow-none focus-visible:ring-0"
        maxLength={5000}
      />
      {showDetails ? (
        <div className="mt-2 grid grid-cols-[8.5rem_1fr] gap-2">
          <Select value={source} onValueChange={(v) => setSource(v as Source)}>
            <SelectTrigger aria-label="Source" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SOURCE_LABEL) as Source[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label="Sender"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="Sender (number, email…)"
            className="h-8 text-xs"
            maxLength={200}
          />
        </div>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => setShowDetails((v) => !v)}
        >
          <IconPlus className="size-3.5" />
          {showDetails ? "Hide details" : "Source & sender"}
        </Button>
        <Button type="submit" size="sm" disabled={!text.trim() || add.isPending}>
          <IconShieldSearch className="size-4" />
          {add.isPending ? "Analyzing…" : "Add & analyze"}
        </Button>
      </div>
    </form>
  );
}
