import type { AgentMode } from '@justcode/tools'
import { theme } from './theme'

/** How each agent mode appears under the composer. */
export const agentModeDisplay: { [MODE in AgentMode]: { label: string; color: string } } = {
  build: { label: 'Build', color: theme.success },
  plan: { label: 'Plan', color: theme.warning },
}
