import { useCallback, useRef, useState } from 'react'
import type { ApprovalDecision, ApprovalRequest } from '../lib/tool-approval'

type PendingApproval = ApprovalRequest & { resolve: (decision: ApprovalDecision) => void }

/**
 * Queues approval requests (the model can make several tool calls at once) and shows them one
 * at a time. "Allow all this session" approves the rest of the queue and every later call.
 */
export function useToolApprovals() {
  const [pending, setPending] = useState<PendingApproval[]>([])
  const allowAll = useRef(false)

  const requestApproval = useCallback((request: ApprovalRequest) => {
    if (allowAll.current) return Promise.resolve<ApprovalDecision>('session')
    return new Promise<ApprovalDecision>((resolve) => {
      setPending((queue) => [...queue, { ...request, resolve }])
    })
  }, [])

  const decide = useCallback((decision: ApprovalDecision) => {
    if (decision === 'session') allowAll.current = true
    setPending((queue) => {
      const [current, ...rest] = queue
      current?.resolve(decision)
      if (decision !== 'session') return rest
      for (const request of rest) request.resolve('session')
      return []
    })
  }, [])

  return { pending, requestApproval, decide }
}

export type ToolApprovals = ReturnType<typeof useToolApprovals>
