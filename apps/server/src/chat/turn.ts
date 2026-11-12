import type { ChatUIMessage } from "@justcode/tools";

type IncomingMessage = { id: string; role: "user" | "assistant" };

export type Turn =
  | { status: "ok"; history: ChatUIMessage[] }
  /** The message id is stored in another session. */
  | { status: "other-session" }
  /** The message resends a stored message with a different role. */
  | { status: "role-mismatch" }
  /** An assistant message that is not the latest stored message. */
  | { status: "not-latest-assistant" };

/**
 * Applies the chat protocol to an incoming message and returns the history it follows.
 * A `user` message starts a turn; resending a stored one is a retry that cuts the history at it.
 * An `assistant` message continues the latest stored message after the CLI ran its tool calls.
 * `isInOtherSession` is only called for message ids this session has not stored.
 */
export async function resolveTurn({
  stored,
  message,
  isInOtherSession
}: {
  stored: ChatUIMessage[];
  message: IncomingMessage;
  isInOtherSession: () => Promise<boolean>;
}): Promise<Turn> {
  const storedIndex = stored.findIndex((storedMessage) => storedMessage.id === message.id);
  if (storedIndex === -1 && await isInOtherSession()) return { status: "other-session" };
  if (storedIndex !== -1 && stored[storedIndex]?.role !== message.role) return { status: "role-mismatch" };
  if (message.role === "assistant" && (storedIndex === -1 || storedIndex !== stored.length - 1)) {
    return { status: "not-latest-assistant" };
  }
  return { status: "ok", history: storedIndex === -1 ? stored : stored.slice(0, storedIndex) };
}
