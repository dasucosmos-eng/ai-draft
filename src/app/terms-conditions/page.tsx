import type { Metadata } from 'next'
import { TermsPage } from './terms-page'

export const metadata: Metadata = {
  title: 'Terms & Conditions — AI Draft',
  description: 'AI Draft Terms and Conditions — Read our terms of service for using the AI-powered legal document platform.',
}

export default function TermsConditions() {
  return <TermsPage />
}
