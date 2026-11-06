import type { STATUSES } from '../constants'

export type TransactionStatus = (typeof STATUSES)[number]

export interface Transaction {
  transactionId: string
  amount: number
  currency: string
  status: TransactionStatus
  timestamp: string
}

export type DisplayedTransaction = Transaction & { animate: boolean }

export type ConnectionState = 'connecting' | 'live' | 'reconnecting'
