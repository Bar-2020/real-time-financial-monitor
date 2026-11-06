import { useState } from 'react'
import { createMockTransaction, settleTransaction, type Transaction } from './transaction'

export const BURST_SIZE = 100
export const STATUS_FOLLOW_UP_MS = 2000

export function AddPage() {
  const [accepted, setAccepted] = useState(0)
  const [failed, setFailed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function post(tx: Transaction) {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx),
      })
      if (!response.ok) throw new Error(`The API responded with ${response.status}`)
      setAccepted((count) => count + 1)
      return true
    } catch (e) {
      setFailed((count) => count + 1)
      setError(e instanceof Error ? e.message : String(e))
      return false
    }
  }

  async function sendOne() {
    const tx = createMockTransaction()
    if (await post(tx)) {
      // Not cancelled on unmount, so you can send, switch to /monitor and watch the status change.
      setTimeout(() => void post(settleTransaction(tx)), STATUS_FOLLOW_UP_MS)
    }
  }

  function send(count: number) {
    setError(null)
    for (let i = 0; i < count; i++) void sendOne()
  }

  return (
    <section>
      <h1>Transaction Simulator</h1>
      <p>
        Sends mock transactions as <code>Pending</code>, then updates each one to <code>Completed</code> or{' '}
        <code>Failed</code> about {STATUS_FOLLOW_UP_MS / 1000} seconds later.
      </p>
      <div className="actions">
        <button type="button" onClick={() => send(1)}>
          Send 1
        </button>
        <button type="button" onClick={() => send(BURST_SIZE)}>
          Send {BURST_SIZE}
        </button>
      </div>
      <p role="status">
        POSTs accepted: {accepted}, failed: {failed}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  )
}
