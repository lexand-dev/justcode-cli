import { z } from "zod";
import { safeValidateUIMessages } from "ai";
import { useEffect, useState } from "react";
import { agentTools, type ChatUIMessage } from "@justcode/tools";
import { client } from "../lib/client";

const sessionMessagesSchema = z.object({ messages: z.array(z.unknown()) });

export type Hydration =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; messages: ChatUIMessage[] };

async function fetchSessionMessages(
  sessionId: string
): Promise<ChatUIMessage[]> {
  const response = await client.sessions[":sessionId"].messages.$get({
    param: { sessionId }
  });
  if (response.status === 404) throw new Error("Session not found.");
  if (!response.ok)
    throw new Error(`Could not load the session (HTTP ${response.status}).`);

  const body = sessionMessagesSchema.safeParse(await response.json());
  if (!body.success)
    throw new Error("Unexpected response while loading the session.");
  // safeValidateUIMessages rejects an empty list; a new session has no messages yet.
  if (body.data.messages.length === 0) return [];

  // With `tools`, each tool call's input and output are checked against the tool's schemas,
  // as the server does; without them the SDK skips tool parts entirely. Finished calls to tools
  // this CLI no longer has become dynamic tool parts instead of failing.
  const validated = await safeValidateUIMessages<ChatUIMessage>({
    messages: body.data.messages,
    tools: agentTools
  });
  if (!validated.success)
    throw new Error("The session contains invalid messages.");
  return validated.data;
}

/** Loads the stored messages of a session, to hydrate `useChat`. */
export function useSessionMessages(sessionId: string): Hydration {
  const [hydration, setHydration] = useState<Hydration>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setHydration({ status: "loading" });

    fetchSessionMessages(sessionId).then(
      (messages) => {
        if (active) setHydration({ status: "ready", messages });
      },
      (error: unknown) => {
        if (active)
          setHydration({
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Could not load the session."
          });
      }
    );

    return () => {
      active = false;
    };
  }, [sessionId]);

  return hydration;
}
