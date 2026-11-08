import { useState } from 'react'
import { postTransaction } from '../api/transactions'
import { STATUS_FOLLOW_UP_MAX_MS, STATUS_FOLLOW_UP_MIN_MS } from '../constants'
import type { Transaction } from '../types'
import { createMockTransaction, settleTransaction } from '../utils/transactions'

export function useTransactionSimulator() {
  const [accepted, setAccepted] = useState(0)
  const [failed, setFailed] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /** Posts one transaction and counts the result. Returns whether the API accepted it. */
  async function submitTransaction(transaction: Transaction) {
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

  async function sendMockTransaction() {
    const transaction = createMockTransaction()
    if (await submitTransaction(transaction)) {
      // Not cancelled on unmount, so you can send, switch to /monitor and watch the status change.
      const followUpDelay =
        STATUS_FOLLOW_UP_MIN_MS + Math.random() * (STATUS_FOLLOW_UP_MAX_MS - STATUS_FOLLOW_UP_MIN_MS)
      setTimeout(() => void submitTransaction(settleTransaction(transaction)), followUpDelay)
    }
  }

  function sendMockTransactions(transactionCount: number) {
    setErrorMessage(null)
    for (let index = 0; index < transactionCount; index++) void sendMockTransaction()
  }

  return { accepted, failed, errorMessage, sendMockTransactions }
}
