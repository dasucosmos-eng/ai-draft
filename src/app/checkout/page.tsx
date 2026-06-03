import type { Metadata } from 'next'
import { CheckoutPage } from './checkout-page'

export const metadata: Metadata = {
  title: 'Checkout — AI Draft',
  description: 'Complete your AI Draft subscription purchase.',
}

export default function Checkout() {
  return <CheckoutPage />
}
