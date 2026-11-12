import { prisma, type Prisma } from "@justcode/db/client";
import { agentTools, type ChatUIMessage } from "@justcode/tools";
import { safeValidateUIMessages } from "ai";

const TITLE_MAX_LENGTH = 100;

// UIMessage parts are typed interfaces, which Prisma's JSON input type does not accept.
// Round-tripping through JSON produces exactly what the JSONB column stores.
function toJson(parts: ChatUIMessage["parts"]): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(parts));
}

function titleFrom(messages: ChatUIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text = firstUserMessage?.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ");
  return text ? text.slice(0, TITLE_MAX_LENGTH) : null;
}

/**
 * Validates messages against the current tools; without `tools` the SDK skips tool inputs and
 * outputs. Used for stored messages and for the history a chat request builds.
 */
export function validateMessages(messages: unknown[]) {
  return safeValidateUIMessages<ChatUIMessage>({ messages, tools: agentTools });
}

export async function createSession() {
  const session = await prisma.session.create({ data: {}, select: { id: true } });
  return session.id;
}

export type StoredSession =
  | { status: "not-found" }
  | { status: "invalid" }
  | { status: "ok"; messages: ChatUIMessage[] };

/** Loads a session's messages in order and validates them against the current tools. */
export async function loadSessionMessages(sessionId: string): Promise<StoredSession> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      messages: {
        orderBy: { position: "asc" },
        select: { id: true, role: true, parts: true }
      }
    }
  });
  if (!session) return { status: "not-found" };
  if (session.messages.length === 0) return { status: "ok", messages: [] };

  const validated = await validateMessages(session.messages);
  return validated.success ? { status: "ok", messages: validated.data } : { status: "invalid" };
}

/** Whether a message id is already stored in a different session. */
export async function isMessageInOtherSession(messageId: string, sessionId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId }, select: { sessionId: true } });
  return message !== null && message.sessionId !== sessionId;
}

/**
 * Makes the stored messages of an existing session match `messages` (the full conversation, in order).
 * Messages no longer in the list (e.g. a reply cut off by a retry) are deleted.
 * `model` is recorded only when an assistant message is first stored.
 */
export async function saveSessionMessages({
  sessionId,
  messages,
  model
}: {
  sessionId: string;
  messages: ChatUIMessage[];
  model: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.session.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    await tx.session.updateMany({
      where: { id: sessionId, title: null },
      data: { title: titleFrom(messages) }
    });

    await tx.message.deleteMany({
      where: { sessionId, id: { notIn: messages.map((message) => message.id) } }
    });

    for (const [position, message] of messages.entries()) {
      const parts = toJson(message.parts);
      await tx.message.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          sessionId,
          role: message.role,
          parts,
          model: message.role === "assistant" ? model : null,
          position
        },
        update: { parts, position }
      });
    }
  });
}
