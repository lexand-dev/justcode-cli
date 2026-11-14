import type { AgentMode } from '@justcode/tools'
import { theme } from './theme'

/** How each agent mode appears under the composer. */
export const agentModeDisplay: { [MODE in AgentMode]: { label: string; color: string; description: string } } = {
  build: { label: 'BUILD', color: theme.success, description: 'edits files, runs commands' },
  plan: { label: 'PLAN', color: theme.warning, description: 'read-only' },
}
