import type { TextareaRenderable } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/react'
import { useRef, useState } from 'react'
import { z } from 'zod'

const messageSchema = z.string().refine((message) => message.trim().length > 0)

export function ChatTextarea({
  disabled = false,
  onSend,
  placeholder = 'Enter a message: Enter to send, Shift+Enter for a new line',
}: {
  disabled?: boolean
  onSend: (text: string) => void
  placeholder?: string
}) {
  const textarea = useRef<TextareaRenderable>(null)
  const [lineCount, setLineCount] = useState(1)
  const { height } = useTerminalDimensions()
  const textareaHeight = Math.max(1, Math.min(lineCount, Math.floor(height / 2)))

  function submit() {
    if (disabled) return

    const message = messageSchema.safeParse(textarea.current?.plainText)
    if (!message.success) return

    textarea.current?.setText('')
    setLineCount(1)
    onSend(message.data)
  }

  return (
    <textarea
      ref={textarea}
      width="100%"
      height={textareaHeight}
      flexShrink={0}
      placeholder={placeholder}
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
  )
}
