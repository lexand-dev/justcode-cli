import { SyntaxStyle } from '@opentui/core'

/** Accent colors for the chat transcript; body text keeps the terminal's default foreground. */
export const theme = {
  user: '#7aa2f7',
  userBackground: '#1f2335',
  assistant: '#bb9af7',
  muted: '#737aa2',
  toolName: '#7dcfff',
  running: '#e0af68',
  success: '#9ece6a',
  error: '#f7768e',
  warning: '#e0af68',
  /** Inline and fenced code, and numbers inside code. */
  code: '#ff9e64',
  /** Type names inside fenced code. */
  codeType: '#2ac3de',
} as const

/** Styles for Markdown markers and fenced code in assistant replies. */
export const markdownStyle = SyntaxStyle.fromStyles({
  'markup.heading': { fg: theme.user, bold: true },
  'markup.strong': { bold: true },
  'markup.italic': { italic: true },
  'markup.strikethrough': { dim: true },
  'markup.raw': { fg: theme.code },
  'markup.raw.block': { fg: theme.code },
  'markup.link': { fg: theme.toolName, underline: true },
  'markup.link.label': { fg: theme.toolName },
  'markup.link.url': { fg: theme.toolName, underline: true },
  'markup.list': { fg: theme.running },
  'markup.quote': { fg: theme.muted, italic: true },
  conceal: { fg: theme.muted },
  keyword: { fg: theme.assistant },
  string: { fg: theme.success },
  comment: { fg: theme.muted, italic: true },
  function: { fg: theme.user },
  number: { fg: theme.code },
  type: { fg: theme.codeType },
})
