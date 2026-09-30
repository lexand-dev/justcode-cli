import type { TextareaRenderable } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/react'
import { useRef, useState } from 'react'
import { z } from 'zod'

const messageSchema = z.string().refine((message) => message.trim().length > 0)

export function ChatTextarea({ disabled, onSend }: { disabled: boolean; onSend: (text: string) => void }) {
  const textarea = useRef<TextareaRenderable>(null)
  const [lineCount, setLineCount] = useState(1)
  const { height } = useTerminalDimensions()
  const textareaHeight = Math.max(3, Math.min(lineCount + 2, Math.floor(height / 2)))

  function submit() {
    if (disabled) return

    const message = messageSchema.safeParse(textarea.current?.plainText)
    if (!message.success) return

    textarea.current?.setText('')
    setLineCount(1)
    onSend(message.data)
  }

  return (
    <box width="100%" border borderStyle="rounded" paddingX={1}>
      <textarea
        ref={textarea}
        width="100%"
        height={textareaHeight}
        placeholder="Enter a message: Enter to send, Shift+Enter for a new line"
        keyBindings={[
          { name: 'return', action: 'submit' },
          { name: 'kpenter', action: 'submit' },
          { name: 'linefeed', action: 'submit' },
          { name: 'return', shift: true, action: 'newline' },
          { name: 'kpenter', shift: true, action: 'newline' },
          { name: 'linefeed', shift: true, action: 'newline' },
        ]}
        onContentChange={() => setLineCount(textarea.current?.lineCount ?? 1)}
        onSubmit={submit}
        focused
      />
    </box>
  )
}
