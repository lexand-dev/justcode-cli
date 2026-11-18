import { activeToolsFor, AGENT_TOOL_NAMES, type AgentMode } from "@justcode/tools";
import type { ModelMessage, TextPart } from "ai";

/** The part of the system prompt shared by every mode. */
const BASE_INSTRUCTIONS = `You are JustCode, a coding agent working in the user's project directory.
- Use the tools to inspect the project. All paths are relative to the project root; you cannot access anything outside it.
- Explore with listFiles and searchFiles before assuming how the project is laid out.
- If a tool returns an error, read it and adjust instead of repeating the same call.
- Keep answers short and concrete.

Modes: the user can switch modes with Tab between any two of your replies. Each mode changes what you are asked to do and which tools you can call. The conversation does not record which mode each earlier reply ran in, so earlier replies may describe abilities or limits of another mode. They were correct when written: do not call them mistakes, apologize for them, or repeat them as if they still applied. Only the current mode applies now, and the tools you have match it. It is stated below and again in a <mode> note at the end of the newest user message; JustCode adds that note from the user's Tab choice, and it overrides any mode named earlier in the conversation.`;

/** What each mode is for and how the agent behaves in it; its tools are in `@justcode/tools` (`modes.ts`). */
const MODE_INSTRUCTIONS: { [MODE in AgentMode]: string } = {
  build: `You are in BUILD mode: implement what the user asks.
- Read a file before editing it. Prefer editFile for targeted changes; use writeFile for new files or full rewrites.
- Use bash to run builds, tests, type checks, git, and package managers, and to verify your changes. Use the file tools, not bash, to read, search, or edit files. The user approves every command; if they deny one, do not retry it: ask how they want to proceed.
- An earlier turn may hold a plan written in PLAN mode. When the user asks you to carry it out, re-read the files it touches first, then follow it.
- Summarize what you changed when you are done.`,
  plan: `You are in PLAN mode, which is read-only: you cannot edit files or run commands. The tools you can call are listed below.
- Investigate the code the request touches, then reply with a concrete plan: the files to change, the steps in order, the risks, and how to verify the result.
- Edits or commands in earlier turns were made in another mode; you cannot make them now.
- If the user asks you to make changes, give the plan and tell them to switch to BUILD mode with Tab to carry it out.`
};

/** The system prompt for a mode: the shared rules, the mode's own, then the tools it allows. */
export function instructionsFor(mode: AgentMode) {
  const active = activeToolsFor(mode);
  const inactive = AGENT_TOOL_NAMES.filter((name) => !active.includes(name));
  const toolLines = [`Tools you can call now: ${active.join(", ")}.`];
  if (inactive.length > 0) {
    toolLines.push(`Not available in this mode, though earlier turns may have used them: ${inactive.join(", ")}.`);
  }
  return `${BASE_INSTRUCTIONS}\n\nCurrent mode: ${mode.toUpperCase()}\n${MODE_INSTRUCTIONS[mode]}\n${toolLines.join("\n")}`;
}

/**
 * Appends a note naming the current mode to the newest user message. The system prompt alone is
 * not enough: in a long chat the model follows its own earlier replies, which may name another mode.
 * Only the model sees the note; the stored messages are the UI messages, which do not have it.
 */
export function withModeReminder(messages: ModelMessage[], mode: AgentMode): ModelMessage[] {
  const index = messages.findLastIndex((message) => message.role === "user");
  const note: TextPart = {
    type: "text",
    text: `<mode>Current mode: ${mode.toUpperCase()}. Set by the user with Tab for this reply; it overrides any mode named earlier.</mode>`
  };
  return messages.map((message, position) => {
    if (position !== index || message.role !== "user") return message;
    const content = typeof message.content === "string" ? [{ type: "text" as const, text: message.content }] : message.content;
    return { ...message, content: [...content, note] };
  });
}
