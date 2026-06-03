import type { Metadata } from 'next'
import { ShippingPage } from './shipping-page'

export const metadata: Metadata = {
  title: 'Shipping & Delivery — AI Draft',
  description: 'AI Draft Shipping and Delivery information — Learn how digital products and services are delivered.',
}

export default function ShippingDelivery() {
  return <ShippingPage />
}
