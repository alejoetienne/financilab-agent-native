import {
  sendToAgentChatAndConfirm,
  type AgentChatMessage,
} from "@agent-native/core/client/agent-chat";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type AskAgentOptions = Pick<AgentChatMessage, "message" | "context">;

/**
 * Submit one visible agent turn from a button, exactly once per click.
 *
 * `sendToAgentChat({ submit: true, openSidebar: true })` hands the same
 * submission to the chat through several paths (a buffered cold-start replay,
 * a live `postMessage`, and the sidebar's retained-event replay once its lazy
 * panel mounts). Fire-and-forget calls can't tell when that submission has
 * landed, so a repeat click or a late replay after the panel mounts starts a
 * second run of the same prompt. This hook:
 *  - keeps one submission in flight at a time (ref guard, not state, so a
 *    double click in the same frame is rejected too);
 *  - targets the in-app sidebar only (`chatTarget: "local"`) and waits for the
 *    chat to confirm delivery, which also cancels the buffered copy if it
 *    times out so it can't be replayed later.
 */
export function useAskAgent() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);

  const ask = useCallback(async (opts: AskAgentOptions) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(true);
    try {
      const result = await sendToAgentChatAndConfirm({
        ...opts,
        submit: true,
        openSidebar: true,
        chatTarget: "local",
      });
      if (!result.delivered) {
        toast.error("The agent chat did not receive the request. Try again.");
      }
      return result.delivered;
    } catch {
      toast.error("Could not reach the agent chat.");
      return false;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  return { ask, pending };
}
