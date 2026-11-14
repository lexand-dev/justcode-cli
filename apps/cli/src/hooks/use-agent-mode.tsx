import { DEFAULT_AGENT_MODE, nextAgentMode, type AgentMode } from '@justcode/tools'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type AgentModeState = { mode: AgentMode; cycleMode: () => void }

const AgentModeContext = createContext<AgentModeState | null>(null)

/** Holds the agent mode for the whole run, so it carries from the home screen into a chat. */
export function AgentModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AgentMode>(DEFAULT_AGENT_MODE)
  const cycleMode = useCallback(() => setMode(nextAgentMode), [])
  const value = useMemo(() => ({ mode, cycleMode }), [mode, cycleMode])
  return <AgentModeContext.Provider value={value}>{children}</AgentModeContext.Provider>
}

/** The active agent mode and a function that switches to the next one. */
export function useAgentMode() {
  const state = useContext(AgentModeContext)
  if (!state) throw new Error('useAgentMode must be used inside AgentModeProvider.')
  return state
}
