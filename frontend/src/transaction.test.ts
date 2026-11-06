import { describe, expect, it } from 'vitest'
import {
  MAX_ROWS,
  createMockTransaction,
  mergeTransactions,
  settleTransaction,
  type Row,
  type Transaction,
} from './transaction'

const tx = (id: string, status: Transaction['status'] = 'Pending', second = 0): Transaction => ({
  transactionId: id,
  amount: 10,
  currency: 'USD',
  status,
  timestamp: new Date(Date.UTC(2024, 0, 15, 10, 0, second)).toISOString(),
})

const ids = (rows: Row[]) => rows.map((row) => row.transactionId)

describe('createMockTransaction', () => {
  it('matches the shape the API validates', () => {
    const mock = createMockTransaction()

    expect(mock.transactionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(mock.amount).toBeGreaterThan(0)
    expect(mock.currency).toMatch(/^[A-Z]{3}$/)
    expect(mock.status).toBe('Pending')
    expect(new Date(mock.timestamp).toISOString()).toBe(mock.timestamp)
  })

  it('creates a different id each time', () => {
    expect(createMockTransaction().transactionId).not.toBe(createMockTransaction().transactionId)
  })
})

describe('settleTransaction', () => {
  const pending = tx('a')

  it('keeps everything except the status and timestamp', () => {
    const settled = settleTransaction(pending)

    expect(settled).toMatchObject({
      transactionId: pending.transactionId,
      amount: pending.amount,
      currency: pending.currency,
    })
    expect(Date.parse(settled.timestamp)).toBeGreaterThan(Date.parse(pending.timestamp))
  })

  it('usually completes and sometimes fails', () => {
    expect(settleTransaction(pending, 0.5).status).toBe('Completed')
    expect(settleTransaction(pending, 0.9).status).toBe('Failed')
  })
})

describe('mergeTransactions', () => {
  it('puts new transactions on top, latest arrival first', () => {
    const rows = mergeTransactions(mergeTransactions([], [tx('a')], true), [tx('b'), tx('c')], true)

    expect(ids(rows)).toEqual(['c', 'b', 'a'])
  })

  it('updates an existing transaction in place', () => {
    const before = mergeTransactions([], [tx('a'), tx('b')], true)

    const after = mergeTransactions(before, [tx('a', 'Completed', 1)], true)

    expect(ids(after)).toEqual(['b', 'a'])
    expect(after[1].status).toBe('Completed')
  })

  it('ignores an out-of-date update', () => {
    const before = mergeTransactions([], [tx('a', 'Completed', 2)], true)

    const after = mergeTransactions(before, [tx('a', 'Pending', 1)], true)

    expect(after[0].status).toBe('Completed')
  })

  it('collapses the same id arriving twice in one batch', () => {
    const rows = mergeTransactions([], [tx('a', 'Pending', 1), tx('a', 'Failed', 2)], true)

    expect(ids(rows)).toEqual(['a'])
    expect(rows[0].status).toBe('Failed')
  })

  it(`keeps only the newest ${MAX_ROWS} rows`, () => {
    const burst = Array.from({ length: MAX_ROWS + 1 }, (_, i) => tx(`id-${i}`))

    const rows = mergeTransactions([], burst, true)

    expect(rows).toHaveLength(MAX_ROWS)
    expect(rows[0].transactionId).toBe(`id-${MAX_ROWS}`)
    expect(ids(rows)).not.toContain('id-0')
  })

  it('animates live arrivals but not history', () => {
    const history = mergeTransactions([], [tx('a')], false)
    const rows = mergeTransactions(history, [tx('b')], true)

    expect(rows.find((row) => row.transactionId === 'a')?.animate).toBe(false)
    expect(rows.find((row) => row.transactionId === 'b')?.animate).toBe(true)
  })

  it('does not start an entrance animation when a history row changes status', () => {
    const history = mergeTransactions([], [tx('a')], false)

    const [row] = mergeTransactions(history, [tx('a', 'Completed', 1)], true)

    expect(row.animate).toBe(false)
  })

  it('keeps unchanged rows as the same object so memoised rows skip rendering', () => {
    const before = mergeTransactions([], [tx('a')], true)

    const after = mergeTransactions(before, [tx('b')], true)

    expect(after[1]).toBe(before[0])
  })
})
