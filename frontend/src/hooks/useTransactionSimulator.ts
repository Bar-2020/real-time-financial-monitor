import { useState } from 'react'
import { postTransaction } from '../api/transactions'
import { createMockTransaction } from '../utils/transactions'

export function useTransactionSimulator() {
  const [accepted, setAccepted] = useState(0)
  const [failed, setFailed] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function sendMockTransaction() {
    try {
      await postTransaction(createMockTransaction())
      setAccepted((count) => count + 1)
    } catch (error) {
      setFailed((count) => count + 1)
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }

  function sendMockTransactions(transactionCount: number) {
    setErrorMessage(null)
    for (let index = 0; index < transactionCount; index++) void sendMockTransaction()
  }

  return { accepted, failed, errorMessage, sendMockTransactions }
}
