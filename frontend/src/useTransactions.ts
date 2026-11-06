import { HttpTransportType, HubConnectionBuilder } from '@microsoft/signalr'
import { useEffect, useState } from 'react'
import { mergeTransactions, type Row, type Transaction } from './transaction'

export const FLUSH_INTERVAL_MS = 100
export const RETRY_DELAY_MS = 3000

export type ConnectionState = 'connecting' | 'live' | 'reconnecting'

export function useTransactions() {
  const [rows, setRows] = useState<Row[]>([])
  const [connection, setConnection] = useState<ConnectionState>('connecting')

  useEffect(() => {
    let stopped = false
    let retry: ReturnType<typeof setTimeout>
    const buffer: Transaction[] = []

    const hub = new HubConnectionBuilder()
      // Skipping negotiation means a single request reaches a single pod, so no sticky sessions are needed.
      .withUrl('/hubs/transactions', { skipNegotiation: true, transport: HttpTransportType.WebSockets })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: () => RETRY_DELAY_MS })
      .build()

    hub.on('snapshot', (snapshot: Transaction[]) =>
      setRows((current) => mergeTransactions(current, [...snapshot].reverse(), false)),
    )
    // Buffered rather than set directly, so a burst of messages costs one render instead of one each.
    hub.on('transaction', (tx: Transaction) => buffer.push(tx))
    hub.onreconnecting(() => setConnection('reconnecting'))
    hub.onreconnected(() => setConnection('live'))

    const flush = setInterval(() => {
      if (buffer.length === 0) return
      const batch = buffer.splice(0)
      setRows((current) => mergeTransactions(current, batch, true))
    }, FLUSH_INTERVAL_MS)

    // Automatic reconnect only covers a connection that was once up, so the first start retries itself.
    const start = () =>
      hub
        .start()
        .then(() => setConnection('live'))
        .catch(() => {
          if (!stopped) retry = setTimeout(start, RETRY_DELAY_MS)
        })
    // Deferred so StrictMode's immediate unmount cancels it, rather than aborting a half-open connection.
    retry = setTimeout(start)

    return () => {
      stopped = true
      clearInterval(flush)
      clearTimeout(retry)
      void hub.stop()
    }
  }, [])

  return { rows, connection }
}
