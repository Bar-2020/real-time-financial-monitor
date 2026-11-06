import { MAX_ROWS } from '../constants'
import type { DisplayedTransaction, Transaction } from '../types'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS']
const FAILURE_RATE = 0.2

export function createMockTransaction(): Transaction {
  return {
    transactionId: crypto.randomUUID(),
    amount: Number((Math.random() * 10_000 + 1).toFixed(2)),
    currency: CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)],
    status: 'Pending',
    timestamp: new Date().toISOString(),
  }
}

export function settleTransaction(transaction: Transaction, randomValue = Math.random()): Transaction {
  return {
    ...transaction,
    status: randomValue < 1 - FAILURE_RATE ? 'Completed' : 'Failed',
    timestamp: new Date().toISOString(),
  }
}

/**
 * New ids go on top and updates stay in place, so a status change animates where the row already is.
 * `arrivals` is oldest first. Unchanged rows keep their object identity so memoised rows skip rendering.
 */
export function mergeTransactions(
  rows: DisplayedTransaction[],
  arrivals: Transaction[],
  animate: boolean,
): DisplayedTransaction[] {
  const rowsById = new Map(rows.map((row) => [row.transactionId, row]))
  const newIds: string[] = []

  for (const transaction of arrivals) {
    const existing = rowsById.get(transaction.transactionId)
    if (!existing) newIds.unshift(transaction.transactionId)
    if (!existing || Date.parse(transaction.timestamp) >= Date.parse(existing.timestamp)) {
      rowsById.set(transaction.transactionId, {
        ...transaction,
        animate: existing ? existing.animate : animate,
      })
    }
  }

  return [...newIds, ...rows.map((row) => row.transactionId)]
    .slice(0, MAX_ROWS)
    .map((id) => rowsById.get(id)!)
}
