import type { Context } from "hono";
import type { StoredSession } from "./store";

/** The response for a session that could not be loaded. */
export function storedSessionError(c: Context, stored: Exclude<StoredSession, { status: "ok" }>) {
  return stored.status === "not-found"
    ? c.text("Session not found.", 404)
    : c.text("Stored messages are invalid.", 500);
}
