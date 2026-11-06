export const STATUSES = ['Pending', 'Completed', 'Failed'] as const
export type TransactionStatus = (typeof STATUSES)[number]

export interface Transaction {
  transactionId: string
  amount: number
  currency: string
  status: TransactionStatus
  timestamp: string
}

export type Row = Transaction & { animate: boolean }

export const MAX_ROWS = 100

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

export function settleTransaction(tx: Transaction, random = Math.random()): Transaction {
  return {
    ...tx,
    status: random < 1 - FAILURE_RATE ? 'Completed' : 'Failed',
    timestamp: new Date().toISOString(),
  }
}

/**
 * New ids go on top and updates stay in place, so a status change animates where the row already is.
 * `arrivals` is oldest first. Unchanged rows keep their object identity so memoised rows skip rendering.
 */
export function mergeTransactions(rows: Row[], arrivals: Transaction[], animate: boolean): Row[] {
  const byId = new Map(rows.map((row) => [row.transactionId, row]))
  const newIds: string[] = []

  for (const tx of arrivals) {
    const existing = byId.get(tx.transactionId)
    if (!existing) newIds.unshift(tx.transactionId)
    if (!existing || Date.parse(tx.timestamp) >= Date.parse(existing.timestamp)) {
      byId.set(tx.transactionId, { ...tx, animate: existing ? existing.animate : animate })
    }
  }

  return [...newIds, ...rows.map((row) => row.transactionId)]
    .slice(0, MAX_ROWS)
    .map((id) => byId.get(id)!)
}
