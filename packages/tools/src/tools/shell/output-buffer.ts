/**
 * Collects process output within a character budget. Longer output keeps its beginning and
 * its end, where commands usually print what they are doing and how they finished, and drops
 * the middle, so a noisy command cannot flood the model's context or the CLI's memory.
 */
export class OutputBuffer {
  private head = "";
  private tail = "";
  private totalChars = 0;

  constructor(
    private readonly headChars: number,
    private readonly tailChars: number
  ) {}

  append(text: string) {
    this.totalChars += text.length;

    const headRoom = this.headChars - this.head.length;
    if (headRoom > 0) {
      this.head += text.slice(0, headRoom);
      text = text.slice(headRoom);
    }
    if (text.length > 0) this.tail = (this.tail + text).slice(-this.tailChars);
  }

  get truncated() {
    return this.totalChars > this.head.length + this.tail.length;
  }

  toString() {
    if (!this.truncated) return this.head + this.tail;
    const omitted = this.totalChars - this.head.length - this.tail.length;
    return `${this.head}\n\n... [${omitted} characters truncated] ...\n\n${this.tail}`;
  }
}
