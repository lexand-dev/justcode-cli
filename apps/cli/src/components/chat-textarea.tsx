import type { TextareaRenderable } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useRef, useState } from "react";
import { z } from "zod";
import { useAgentMode } from "../hooks/use-agent-mode";
import { agentModeDisplay } from "../lib/agent-modes";
import { LEFT_BAR_CHARS } from "../lib/left-bar";
import { theme } from "../lib/theme";

const messageSchema = z.string().refine((message) => message.trim().length > 0);

// Mock values until the server reports the model it runs.
const MOCK_MODEL = "deepseek-v4-flash";
const MOCK_PROVIDER = "DeepSeek";

export function ChatTextarea({
  disabled = false,
  initialValue,
  onSend,
  placeholder = "Enter a message: Enter to send, Shift+Enter for a new line"
}: {
  disabled?: boolean;
  initialValue?: string;
  onSend: (text: string) => void;
  placeholder?: string;
}) {
  const textarea = useRef<TextareaRenderable>(null);
  const [lineCount, setLineCount] = useState(
    () => initialValue?.split("\n").length ?? 1
  );
  const { height } = useTerminalDimensions();
  const textareaHeight = Math.max(
    1,
    Math.min(lineCount, Math.floor(height / 2))
  );
  const { mode, cycleMode } = useAgentMode();
  const modeDisplay = agentModeDisplay[mode];

  // The textarea ignores Tab (it inserts no control characters), so it is free for switching modes.
  // It still works while a reply streams: the next request, such as a tool-result continuation, uses the new mode.
  useKeyboard((key) => {
    if (key.name === "tab" && !key.ctrl && !key.meta && !key.shift) cycleMode();
  });

  function submit() {
    if (disabled) return;

    const message = messageSchema.safeParse(textarea.current?.plainText);
    if (!message.success) return;

    textarea.current?.setText("");
    setLineCount(1);
    onSend(message.data);
  }

  return (
    <box flexDirection="column" width="100%" flexShrink={0}>
      <box
        border={["left"]}
        customBorderChars={LEFT_BAR_CHARS}
        borderColor={modeDisplay.color}
        backgroundColor={theme.inputBackground}
        paddingX={2}
        paddingY={1}
        gap={1}
      >
        <textarea
          ref={textarea}
          width="100%"
          height={textareaHeight}
          flexShrink={0}
          backgroundColor={theme.inputBackground}
          focusedBackgroundColor={theme.inputBackground}
          placeholder={placeholder}
          initialValue={initialValue}
          keyBindings={[
            { name: "return", action: "submit" },
            { name: "kpenter", action: "submit" },
            { name: "linefeed", action: "submit" },
            { name: "return", shift: true, action: "newline" },
            { name: "kpenter", shift: true, action: "newline" },
            { name: "linefeed", shift: true, action: "newline" }
          ]}
          onContentChange={() => setLineCount(textarea.current?.lineCount ?? 1)}
          onSubmit={submit}
          focused
        />
        <text fg={theme.muted}>
          <span fg={modeDisplay.color}>
            <strong>{modeDisplay.label}</strong>
          </span>
          {" · "}
          <span fg={theme.model}>{MOCK_MODEL}</span>
          {" · "}
          <span fg={theme.provider}>{MOCK_PROVIDER}</span>
        </text>
      </box>
    </box>
  );
}
