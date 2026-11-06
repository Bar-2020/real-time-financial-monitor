import { HttpTransportType, HubConnectionBuilder } from '@microsoft/signalr'
import { RETRY_DELAY_MS } from '../constants'
import type { Transaction } from '../types'

export async function postTransaction(transaction: Transaction) {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction),
  })
  if (!response.ok) throw new Error(`The API responded with ${response.status}`)
}

export function createTransactionHub() {
  return (
    new HubConnectionBuilder()
      // Skipping negotiation means a single request reaches a single pod, so no sticky sessions are needed.
      .withUrl('/hubs/transactions', { skipNegotiation: true, transport: HttpTransportType.WebSockets })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: () => RETRY_DELAY_MS })
      .build()
  )
}
