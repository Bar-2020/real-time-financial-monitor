import { BURST_SIZE } from '../../constants'
import { useTransactionSimulator } from '../../hooks/useTransactionSimulator'
import './AddPage.css'

export function AddPage() {
  const { accepted, failed, errorMessage, sendMockTransactions } = useTransactionSimulator()

  return (
    <section>
      <h1>Transaction Simulator</h1>
      <p>
        Sends mock transactions as <code>Pending</code>. The backend resolves each one to <code>Completed</code> or{' '}
        <code>Failed</code> a few seconds later.
      </p>
      <div className="add-page-actions">
        <button type="button" onClick={() => sendMockTransactions(1)}>
          Send 1
        </button>
        <button type="button" onClick={() => sendMockTransactions(BURST_SIZE)}>
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
