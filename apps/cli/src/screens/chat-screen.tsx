import { z } from "zod";
import { useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import type { ChatUIMessage } from "@justcode/tools";
import { useLocation, useParams } from "react-router";

import { ChatShell } from "../components/chat-shell";
import { ChatTextarea } from "../components/chat-textarea";
import { ChatTranscript } from "../components/chat-transcript";
import { ToolApprovalPrompt } from "../components/tool-approval-prompt";

import { useTranscript } from "../hooks/use-transcript";
import { useSessionMessages } from "../hooks/use-session-messages";
import { MAX_TOOL_CALLS_PER_TURN, useAgentChat } from "../hooks/use-agent-chat";
import { theme } from "../lib/theme";

const sessionParamsSchema = z.object({ sessionId: z.uuid() });
const chatStateSchema = z.object({
  message: z.string().refine((message) => message.trim().length > 0)
});

function Conversation({
  sessionId,
  initialMessages,
  prompt
}: {
  sessionId: string;
  initialMessages: ChatUIMessage[];
  prompt: string | null;
}) {
  const {
    messages,
    sendMessage,
    regenerate,
    status,
    error,
    approvals,
    toolLimitReached
  } = useAgentChat({
    sessionId,
    initialMessages
  });
  const transcript = useTranscript(messages, error);

  useEffect(() => {
    if (prompt !== null) void sendMessage({ text: prompt });
  }, [prompt, sendMessage]);

  useKeyboard((key) => {
    if (key.ctrl && key.name === "r" && status === "error") void regenerate();
  });

  const approval = approvals.pending[0];
  const composer = approval ? (
    <ToolApprovalPrompt
      key={approval.toolCallId}
      request={approval}
      pendingCount={approvals.pending.length}
      onDecide={approvals.decide}
    />
  ) : (
    <ChatTextarea
      disabled={status !== "ready"}
      onSend={(text) => {
        void sendMessage({ text });
      }}
    />
  );

  return (
    <ChatShell composer={composer}>
      <ChatTranscript
        entries={transcript}
        messages={messages}
        retryAvailable={status === "error"}
      />
      {status === "submitted" ? (
        <text fg={theme.muted}>
          <em>Generating…</em>
        </text>
      ) : null}
      {toolLimitReached ? (
        <text fg={theme.warning}>
          Stopped after {MAX_TOOL_CALLS_PER_TURN} tool calls. Send a message to
          continue.
        </text>
      ) : null}
    </ChatShell>
  );
}

function SessionChat({
  sessionId,
  prompt
}: {
  sessionId: string;
  prompt: string | null;
}) {
  const hydration = useSessionMessages(sessionId);

  if (hydration.status === "ready") {
    return (
      <Conversation
        sessionId={sessionId}
        initialMessages={hydration.messages}
        prompt={prompt}
      />
    );
  }

  return (
    <box padding={1}>
      <text>
        {hydration.status === "loading"
          ? "Loading session..."
          : `Error: ${hydration.error}`}
      </text>
    </box>
  );
}

export function ChatScreen() {
  const { state, key } = useLocation();
  const params = sessionParamsSchema.safeParse(useParams());
  const chatState = chatStateSchema.safeParse(state);

  if (!params.success) {
    return (
      <box padding={1}>
        <text>Error: Invalid session id.</text>
      </box>
    );
  }

  return (
    <SessionChat
      key={key}
      sessionId={params.data.sessionId}
      prompt={chatState.success ? chatState.data.message : null}
    />
  );
}
