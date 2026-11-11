import { useKeyboard } from "@opentui/react";
import { theme } from "../lib/theme";
import type { ApprovalDecision, ApprovalRequest } from "../lib/tool-approval";

const options: {
  name: string;
  description: string;
  value: ApprovalDecision;
}[] = [
  { name: "Yes (y)", description: "", value: "once" },
  {
    name: "Yes, allow all commands this session (a)",
    description: "",
    value: "session"
  },
  {
    name: "No, tell the agent what to do instead (n / Esc)",
    description: "",
    value: "deny"
  }
];

const shortcuts: Partial<Record<string, ApprovalDecision>> = {
  y: "once",
  a: "session",
  n: "deny",
  escape: "deny"
};

/** Replaces the composer while a tool call waits for the user's approval. */
export function ToolApprovalPrompt({
  request,
  pendingCount,
  onDecide
}: {
  request: ApprovalRequest;
  /** Approvals waiting in total, including this one. */
  pendingCount: number;
  onDecide: (decision: ApprovalDecision) => void;
}) {
  useKeyboard((key) => {
    const decision = shortcuts[key.name];
    if (decision && !key.ctrl && !key.meta) onDecide(decision);
  });

  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={theme.warning}
      paddingX={1}
      title={
        request.toolName === "bash"
          ? " Run command? "
          : ` Run ${request.toolName}? `
      }
    >
      {request.description ? (
        <text fg={theme.muted}>{request.description}</text>
      ) : null}
      <text>
        <span fg={theme.toolName}>$ </span>
        {request.summary}
      </text>
      {pendingCount > 1 ? (
        <text fg={theme.muted}>{pendingCount - 1} more waiting</text>
      ) : null}
      <select
        marginTop={1}
        height={options.length}
        options={options}
        showDescription={false}
        selectedTextColor={theme.warning}
        onSelect={(_index, option) => {
          const decision = options.find(
            (candidate) => candidate.name === option?.name
          )?.value;
          if (decision) onDecide(decision);
        }}
        focused
      />
    </box>
  );
}
