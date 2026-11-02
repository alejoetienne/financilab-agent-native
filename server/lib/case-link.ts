import { buildDeepLink } from "@agent-native/core/server";

export function inboxLink(caseId?: string) {
  return buildDeepLink({
    view: "inbox",
    to: caseId ? `/inbox?case=${encodeURIComponent(caseId)}` : "/inbox",
    ...(caseId ? { params: { caseId } } : {}),
  });
}
