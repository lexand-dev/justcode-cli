import type { TextareaRenderable } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/react'
import { useRef, useState, type RefObject } from 'react'
import { useNavigate } from 'react-router'
import { z } from 'zod'

const promptSchema = z.string().refine((prompt) => prompt.trim().length > 0)

function useTextareaHeight(textarea: RefObject<TextareaRenderable | null>) {
  const [lineCount, setLineCount] = useState(1)
  const { height } = useTerminalDimensions()
  const textareaHeight = Math.max(3, Math.min(lineCount + 2, Math.floor(height / 2)))

  function updateLineCount() {
    setLineCount(textarea.current?.lineCount ?? 1)
  }

  return { textareaHeight, updateLineCount }
}

export function HomeTextarea() {
  const textarea = useRef<TextareaRenderable>(null)
  const { textareaHeight, updateLineCount } = useTextareaHeight(textarea)
  const navigate = useNavigate()

  function goToChat() {
    const prompt = promptSchema.safeParse(textarea.current?.plainText)
    if (!prompt.success) return

    textarea.current?.setText('')
    void navigate('/chat', { state: { message: prompt.data } })
  }

  return (
    <box width="100%" border borderStyle="rounded" paddingX={1}>
      <textarea
        ref={textarea}
        width="100%"
        height={textareaHeight}
        placeholder="Enter a message: Enter to chat, Shift+Enter for a new line"
        keyBindings={[
          { name: 'return', action: 'submit' },
          { name: 'kpenter', action: 'submit' },
          { name: 'linefeed', action: 'submit' },
          { name: 'return', shift: true, action: 'newline' },
          { name: 'kpenter', shift: true, action: 'newline' },
          { name: 'linefeed', shift: true, action: 'newline' },
        ]}
        onContentChange={updateLineCount}
        onSubmit={goToChat}
        focused
      />
    </box>
  )
}
