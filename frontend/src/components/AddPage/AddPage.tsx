import { useState } from 'react'
import { postTransaction } from '../../api/transactions'
import { BURST_SIZE, STATUS_FOLLOW_UP_MAX_MS, STATUS_FOLLOW_UP_MIN_MS } from '../../constants'
import type { Transaction } from '../../types'
import { createMockTransaction, settleTransaction } from '../../utils/transactions'
import './AddPage.css'

export function AddPage() {
  const [accepted, setAccepted] = useState(0)
  const [failed, setFailed] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function post(transaction: Transaction) {
    try {
      await postTransaction(transaction)
      setAccepted((count) => count + 1)
      return true
    } catch (error) {
      setFailed((count) => count + 1)
      setErrorMessage(error instanceof Error ? error.message : String(error))
      return false
    }
  }

  async function sendOne() {
    const transaction = createMockTransaction()
    if (await post(transaction)) {
      // Not cancelled on unmount, so you can send, switch to /monitor and watch the status change.
      const followUpDelay =
        STATUS_FOLLOW_UP_MIN_MS + Math.random() * (STATUS_FOLLOW_UP_MAX_MS - STATUS_FOLLOW_UP_MIN_MS)
      setTimeout(() => void post(settleTransaction(transaction)), followUpDelay)
    }
  }

  function send(transactionCount: number) {
    setErrorMessage(null)
    for (let index = 0; index < transactionCount; index++) void sendOne()
  }

  return (
    <section>
      <h1>Transaction Simulator</h1>
      <p>
        Sends mock transactions as <code>Pending</code>, then updates each one to <code>Completed</code> or{' '}
        <code>Failed</code> {STATUS_FOLLOW_UP_MIN_MS / 1000} to {STATUS_FOLLOW_UP_MAX_MS / 1000} seconds later.
      </p>
      <div className="add-page-actions">
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
      {errorMessage && (
        <p role="alert" className="add-page-error">
          {errorMessage}
        </p>
      )}
    </section>
  )
}
