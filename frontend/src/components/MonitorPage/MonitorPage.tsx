import { useMemo, useState } from 'react'
import { STATUSES } from '../../constants'
import { useTransactions } from '../../hooks/useTransactions'
import type { ConnectionState, TransactionStatus } from '../../types'
import { TransactionRow } from '../TransactionRow/TransactionRow'
import './MonitorPage.css'

type Filter = 'All' | TransactionStatus

const FILTERS: Filter[] = ['All', ...STATUSES]

const CONNECTION_LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
}

export function MonitorPage() {
  const { rows, connection } = useTransactions()
  const [filter, setFilter] = useState<Filter>('All')
  const visibleRows = useMemo(
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

      <div className="monitor-filters" role="group" aria-label="Filter by status">
        {FILTERS.map((filterOption) => (
          <button
            key={filterOption}
            type="button"
            className="monitor-filter"
            aria-pressed={filter === filterOption}
            onClick={() => setFilter(filterOption)}
          >
            {filterOption}
          </button>
        ))}
      </div>

      <div className="monitor-table-scroll">
        <table className="monitor-table">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="monitor-empty">
                  {rows.length === 0 ? 'No transactions yet.' : 'No transactions match this filter.'}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => <TransactionRow key={row.transactionId} row={row} />)
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
