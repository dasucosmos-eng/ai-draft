import type { Metadata } from 'next'
import { RefundPage } from './refund-page'

export const metadata: Metadata = {
  title: 'Refund & Cancellation — AI Draft',
  description: 'AI Draft Refund and Cancellation Policy — Understand our refund process and cancellation terms.',
}

export default function RefundCancellation() {
  return <RefundPage />
}
