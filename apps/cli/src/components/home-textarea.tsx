import type { TextareaRenderable } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/react'
import { useRef, useState, type RefObject } from 'react'
import { useNavigate } from 'react-router'

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

  function goToRoute() {
    const path = textarea.current?.plainText.split(/\r?\n/, 1)[0]?.trim()
    if (!path) return

    textarea.current?.setText('')
    void navigate(path.startsWith('/') ? path : `/${path}`)
  }

  return (
    <box width="100%" border borderStyle="rounded" paddingX={1}>
      <textarea
        ref={textarea}
        width="100%"
        height={textareaHeight}
        placeholder="Enter a route: Enter to go, Shift+Enter for a new line"
        keyBindings={[
          { name: 'return', action: 'submit' },
          { name: 'kpenter', action: 'submit' },
          { name: 'linefeed', action: 'submit' },
          { name: 'return', shift: true, action: 'newline' },
          { name: 'kpenter', shift: true, action: 'newline' },
          { name: 'linefeed', shift: true, action: 'newline' },
        ]}
        onContentChange={updateLineCount}
        onSubmit={goToRoute}
        focused
      />
    </box>
  )
}
