import { describe, expect, it } from 'vitest'
import { MAX_ROWS } from '../constants'
import type { Row, Transaction } from '../types'
import { createMockTransaction, mergeTransactions, settleTransaction } from './transactions'

const makeTransaction = (id: string, status: Transaction['status'] = 'Pending', second = 0): Transaction => ({
  transactionId: id,
  amount: 10,
  currency: 'USD',
  status,
  timestamp: new Date(Date.UTC(2024, 0, 15, 10, 0, second)).toISOString(),
})

const ids = (rows: Row[]) => rows.map((row) => row.transactionId)

describe('createMockTransaction', () => {
  it('matches the shape the API validates', () => {
    const mockTransaction = createMockTransaction()

    expect(mockTransaction.transactionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(mockTransaction.amount).toBeGreaterThan(0)
    expect(mockTransaction.currency).toMatch(/^[A-Z]{3}$/)
    expect(mockTransaction.status).toBe('Pending')
    expect(new Date(mockTransaction.timestamp).toISOString()).toBe(mockTransaction.timestamp)
  })

  it('creates a different id each time', () => {
    expect(createMockTransaction().transactionId).not.toBe(createMockTransaction().transactionId)
  })
})

describe('settleTransaction', () => {
  const pending = makeTransaction('a')

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
    const rows = mergeTransactions(mergeTransactions([], [makeTransaction('a')], true), [makeTransaction('b'), makeTransaction('c')], true)

    expect(ids(rows)).toEqual(['c', 'b', 'a'])
  })

  it('updates an existing transaction in place', () => {
    const before = mergeTransactions([], [makeTransaction('a'), makeTransaction('b')], true)

    const after = mergeTransactions(before, [makeTransaction('a', 'Completed', 1)], true)

    expect(ids(after)).toEqual(['b', 'a'])
    expect(after[1].status).toBe('Completed')
  })

  it('ignores an out-of-date update', () => {
    const before = mergeTransactions([], [makeTransaction('a', 'Completed', 2)], true)

    const after = mergeTransactions(before, [makeTransaction('a', 'Pending', 1)], true)

    expect(after[0].status).toBe('Completed')
  })

  it('collapses the same id arriving twice in one batch', () => {
    const rows = mergeTransactions([], [makeTransaction('a', 'Pending', 1), makeTransaction('a', 'Failed', 2)], true)

    expect(ids(rows)).toEqual(['a'])
    expect(rows[0].status).toBe('Failed')
  })

  it(`keeps only the newest ${MAX_ROWS} rows`, () => {
    const burst = Array.from({ length: MAX_ROWS + 1 }, (_, index) => makeTransaction(`id-${index}`))

    const rows = mergeTransactions([], burst, true)

    expect(rows).toHaveLength(MAX_ROWS)
    expect(rows[0].transactionId).toBe(`id-${MAX_ROWS}`)
    expect(ids(rows)).not.toContain('id-0')
  })

  it('animates live arrivals but not history', () => {
    const history = mergeTransactions([], [makeTransaction('a')], false)
    const rows = mergeTransactions(history, [makeTransaction('b')], true)

    expect(rows.find((row) => row.transactionId === 'a')?.animate).toBe(false)
    expect(rows.find((row) => row.transactionId === 'b')?.animate).toBe(true)
  })

  it('does not start an entrance animation when a history row changes status', () => {
    const history = mergeTransactions([], [makeTransaction('a')], false)

    const [row] = mergeTransactions(history, [makeTransaction('a', 'Completed', 1)], true)

    expect(row.animate).toBe(false)
  })

  it('keeps unchanged rows as the same object so memoised rows skip rendering', () => {
    const before = mergeTransactions([], [makeTransaction('a')], true)

    const after = mergeTransactions(before, [makeTransaction('b')], true)

    expect(after[1]).toBe(before[0])
  })
})
