import type { Metadata } from 'next'
import { PrivacyPage } from './privacy-page'

export const metadata: Metadata = {
  title: 'Privacy Policy — AI Draft',
  description: 'AI Draft Privacy Policy — How we collect, use, and protect your data.',
}

export default function PrivacyPolicy() {
  return <PrivacyPage />
}
