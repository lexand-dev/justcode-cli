import { APP_NAME } from "@justcode/shared";

const DIM_COLOR = "#626262";
const BRIGHT_COLOR = "#B2B2B2";

// "JustCode" -> ["Just", "Code"]: the first word is dimmed, the rest is bright.
const [dimWord = "", ...brightWords] = APP_NAME.split(/(?=[A-Z])/);

export function AsciiArt() {
  return (
    <box flexDirection="row" gap={1}>
      <ascii-font font="tiny" text={dimWord} color={DIM_COLOR} />
      <ascii-font
        font="tiny"
        text={brightWords.join("")}
        color={BRIGHT_COLOR}
      />
    </box>
  );
}
