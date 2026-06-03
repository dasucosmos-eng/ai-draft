import type { Metadata } from 'next'
import { ContactPage } from './contact-page'

export const metadata: Metadata = {
  title: 'Contact Us — AI Draft',
  description: 'Get in touch with AI Draft support for help with your legal document drafting, research, and case management platform.',
}

export default function Contact() {
  return <ContactPage />
}
