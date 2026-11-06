import { useEffect, useState } from 'react'
import { createTransactionHub } from '../api/transactions'
import { FLUSH_INTERVAL_MS, RETRY_DELAY_MS } from '../constants'
import type { ConnectionState, DisplayedTransaction, Transaction } from '../types'
import { mergeTransactions } from '../utils/transactions'

export function useTransactions() {
  const [rows, setRows] = useState<DisplayedTransaction[]>([])
  const [connection, setConnection] = useState<ConnectionState>('connecting')

  useEffect(() => {
    let stopped = false
    let retryTimer: ReturnType<typeof setTimeout>
    const buffer: Transaction[] = []
    const hub = createTransactionHub()

    hub.on('snapshot', (snapshot: Transaction[]) =>
      setRows((currentRows) => mergeTransactions(currentRows, [...snapshot].reverse(), false)),
    )
    // Buffered rather than set directly, so a burst of messages costs one render instead of one each.
    hub.on('transaction', (transaction: Transaction) => buffer.push(transaction))
    hub.onreconnecting(() => setConnection('reconnecting'))
    hub.onreconnected(() => setConnection('live'))

    const flushTimer = setInterval(() => {
      if (buffer.length === 0) return
      const batch = buffer.splice(0)
      setRows((currentRows) => mergeTransactions(currentRows, batch, true))
    }, FLUSH_INTERVAL_MS)

    // Automatic reconnect only covers a connection that was once up, so the first start retries itself.
    const start = () =>
      hub
        .start()
        .then(() => setConnection('live'))
        .catch(() => {
          if (!stopped) retryTimer = setTimeout(start, RETRY_DELAY_MS)
        })
    // Deferred so StrictMode's immediate unmount cancels it, rather than aborting a half-open connection.
    retryTimer = setTimeout(start)

    return () => {
      stopped = true
      clearInterval(flushTimer)
      clearTimeout(retryTimer)
      void hub.stop()
    }
  }, [])

  return { rows, connection }
}
