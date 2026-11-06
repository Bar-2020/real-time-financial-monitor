import { memo, useMemo, useState } from 'react'
import { STATUSES, type Row, type TransactionStatus } from './transaction'
import { useTransactions, type ConnectionState } from './useTransactions'

type Filter = 'All' | TransactionStatus

const FILTERS: Filter[] = ['All', ...STATUSES]

const CONNECTION_LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
}

// Intl formatters are slow to create and rows render in bursts, so each one is created once.
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' })
const amountFormats = new Map<string, Intl.NumberFormat>()

function formatAmount(amount: number, currency: string) {
  let format = amountFormats.get(currency)
  if (!format) {
    format = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    amountFormats.set(currency, format)
  }
  return format.format(amount)
}

const TransactionRow = memo(function TransactionRow({ row }: { row: Row }) {
  return (
    <tr className={row.animate ? 'row-enter' : undefined}>
      <td title={row.transactionId}>{row.transactionId.slice(0, 8)}</td>
      <td className="amount">{formatAmount(row.amount, row.currency)}</td>
      <td>
        <span className={`badge badge-${row.status.toLowerCase()}`}>{row.status}</span>
      </td>
      <td>{timeFormat.format(new Date(row.timestamp))}</td>
    </tr>
  )
})

export function MonitorPage() {
  const { rows, connection } = useTransactions()
  const [filter, setFilter] = useState<Filter>('All')
  const visible = useMemo(
    () => (filter === 'All' ? rows : rows.filter((row) => row.status === filter)),
    [rows, filter],
  )

  return (
    <section>
      <header className="monitor-header">
        <h1>Live Monitor</h1>
        <p role="status" className={`connection connection-${connection}`}>
          {CONNECTION_LABELS[connection]}
        </p>
      </header>

      <div className="actions" role="group" aria-label="Filter by status">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            className="filter"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col" className="amount">
                Amount
              </th>
              <th scope="col">Status</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <TransactionRow key={row.transactionId} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <p className="empty">
          {rows.length === 0 ? 'No transactions yet.' : 'No transactions match this filter.'}
        </p>
      )}
    </section>
  )
}
