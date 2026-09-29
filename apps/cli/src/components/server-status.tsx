import { useEffect, useState } from 'react'
import { client } from '../lib/client'

export function ServerStatus() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    let active = true

    async function checkHealth() {
      try {
        const response = await client.health.$get()
        if (!response.ok) throw new Error('Server unavailable')

        const { status } = await response.json()
        if (active) setStatus(status)
      } catch {
        if (active) setStatus('unavailable')
      }
    }

    void checkHealth()
    return () => {
      active = false
    }
  }, [])

  return <text>Server: {status}</text>
}
