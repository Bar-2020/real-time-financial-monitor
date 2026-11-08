import { HttpTransportType, HubConnectionBuilder } from '@microsoft/signalr'
import { RETRY_DELAY_MS } from '../constants'
import type { Transaction } from '../types'

const TRANSACTIONS_API_URL = '/api/transactions'
const TRANSACTIONS_HUB_URL = '/hubs/transactions'

export async function postTransaction(transaction: Transaction) {
  const response = await fetch(TRANSACTIONS_API_URL, {
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
      .withUrl(TRANSACTIONS_HUB_URL, { skipNegotiation: true, transport: HttpTransportType.WebSockets })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: () => RETRY_DELAY_MS })
      .build()
  )
}
