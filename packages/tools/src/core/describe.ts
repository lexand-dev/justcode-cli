// Helpers for the short call and result descriptions the CLI shows next to a tool call.

/** `1 line`, `2 lines`. */
export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** The first line of `text`, at most `maxLength` characters; an ellipsis marks anything left out. */
export function firstLine(text: string, maxLength: number) {
  const [line = ""] = text.split("\n");
  const kept = line.length > maxLength ? line.slice(0, maxLength - 1) : line;
  return kept === text ? text : `${kept}…`;
}
