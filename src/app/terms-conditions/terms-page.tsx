'use client'

import { PublicPageLayout } from '@/components/shared/public-page-layout'
import { Scale, FileCheck, AlertTriangle, Users, CreditCard, Gavel, Shield, Clock } from 'lucide-react'

const termsSections = [
  {
    title: '1. Acceptance of Terms',
    content: [
      'By accessing or using AI Draft (the "Platform"), hosted at aidraft.bond, you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to all of these Terms, you must not use the Platform. These Terms constitute a legally binding agreement between you ("User," "you," or "your") and AI Draft ("we," "our," or "us").',
      'We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting the revised Terms on the Platform. Your continued use of the Platform after any such changes constitutes your acceptance of the updated Terms. We will make reasonable efforts to notify registered users of material changes via email or platform notifications.',
      'AI Draft is designed specifically for use by legal professionals in India, including advocates, law firms, legal departments, and law students. By using the Platform, you represent and warrant that you are a legal professional or a student enrolled in a recognized law program in India.',
    ],
  },
  {
    title: '2. Description of Services',
    content: [
      'AI Draft provides an AI-powered legal document drafting, case research, and case management platform. Our services include but are not limited to: AI-assisted drafting of legal documents including plaints, written statements, petitions, contracts, agreements, legal notices, affidavits, and memorandums; AI-powered case research across Indian judgments and statutes; client and case management tools; document storage and organization; and billing and invoicing for legal services.',
      'The AI-generated content provided through our Platform is intended as a drafting aid and starting point for legal documents. It does not constitute legal advice. Users are solely responsible for reviewing, verifying, and customizing all AI-generated content before use in any legal proceeding, filing, or client communication. AI Draft makes no warranties regarding the accuracy, completeness, or legal sufficiency of AI-generated content.',
      'Access to certain features may require a paid subscription. Subscription plans, pricing, and included features are described on our Pricing page and are subject to change with reasonable notice to active subscribers.',
    ],
  },
  {
    title: '3. User Accounts & Registration',
    content: [
      'To use AI Draft, you must create an account by providing accurate and complete information including your name, email address, phone number, and professional details. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.',
      'Each user is permitted to maintain one active account. Creating multiple accounts, sharing account credentials, or allowing unauthorized persons to access your account is strictly prohibited and may result in immediate suspension or termination. Law firms and legal departments may purchase team plans that provide separate accounts for multiple users.',
      'You agree to provide true, accurate, current, and complete information during registration and to update such information to keep it accurate and complete. Failure to do so may result in suspension or termination of your account.',
    ],
  },
  {
    title: '4. Acceptable Use Policy',
    content: [
      'You agree to use AI Draft only for lawful purposes and in accordance with these Terms. You shall not use the Platform to draft documents for illegal purposes, generate content that is defamatory, obscene, or infringes on third-party rights, attempt to reverse engineer, decompile, or otherwise access the source code of our AI models or platform, use automated tools or bots to scrape data from the Platform, or interfere with or disrupt the Platform\'s functionality.',
      'The Platform is designed for Indian legal practice. While users may use the Platform for general document drafting purposes, the AI models and legal research databases are optimized for Indian law, including the Constitution of India, Indian Penal Code, Code of Civil Procedure, Code of Criminal Procedure, and other Indian statutes and case law.',
      'You are responsible for ensuring that all documents created using AI Draft comply with applicable court rules, filing requirements, and professional conduct standards. AI Draft is a tool to assist in the drafting process and does not replace the professional judgment of a qualified legal practitioner.',
    ],
  },
  {
    title: '5. Intellectual Property',
    content: [
      'AI Draft and its original content, features, and functionality are owned by AI Draft and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. Our AI models, training data, algorithms, and proprietary technology are confidential trade secrets.',
      'Documents and content you create using the Platform remain your intellectual property. AI Draft does not claim ownership of user-generated content. However, by using our AI tools, you grant AI Draft a limited, non-exclusive license to process your input for the purpose of generating AI output and improving our AI models.',
      'You may not copy, modify, distribute, sell, or lease any part of our Platform, nor may you reverse engineer or attempt to extract the source code of our AI models, unless applicable law permits such activity despite this restriction.',
    ],
  },
  {
    title: '6. AI-Generated Content Disclaimer',
    content: [
      'AI Draft uses advanced artificial intelligence and machine learning models to assist in legal document drafting and research. While we strive for accuracy, AI-generated content may contain errors, omissions, or outdated legal references. Users must independently verify all AI-generated content against current statutes, regulations, and case law before relying on it for any legal purpose.',
      'The AI models are trained on publicly available legal data and are designed to assist legal professionals in the drafting process. They are not a substitute for legal research, professional judgment, or the advice of a qualified legal practitioner. Users assume full responsibility for the accuracy and legal sufficiency of all documents created using the Platform.',
      'AI Draft does not guarantee that AI-generated documents will be accepted by any court, tribunal, or authority. Court acceptance depends on various factors including local court rules, specific case requirements, and the discretion of the presiding officer.',
    ],
  },
  {
    title: '7. Payment & Subscription Terms',
    content: [
      'Paid subscription plans are billed on a monthly or annual basis as selected during subscription purchase. Prices are listed in Indian Rupees (INR) and include applicable taxes unless otherwise stated. By subscribing to a paid plan, you authorize us to charge the applicable fees to your chosen payment method.',
      'Subscriptions auto-renew at the end of each billing period unless cancelled at least 24 hours before the renewal date. You can cancel your subscription at any time through your account settings or by contacting our support team. Cancellation will take effect at the end of the current billing period.',
      'We reserve the right to adjust pricing with 30 days advance notice to active subscribers. Existing subscribers will be given the option to continue at the current price for one additional billing cycle after a price increase.',
    ],
  },
  {
    title: '8. Limitation of Liability',
    content: [
      'To the maximum extent permitted by applicable law, AI Draft shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, client relationships, or business opportunities, arising from or related to your use of or inability to use the Platform.',
      'Our total liability for any claim arising from these Terms or the Platform shall not exceed the amount you paid to AI Draft in the 12 months preceding the claim. This limitation applies regardless of the legal theory on which the claim is based.',
      'AI Draft is not liable for any losses or damages resulting from your reliance on AI-generated content, errors in legal research results, or any actions taken based on information provided through the Platform. Users acknowledge that the Platform is a tool to assist in legal work and that professional verification of all output is required.',
    ],
  },
  {
    title: '9. Indemnification',
    content: [
      'You agree to indemnify and hold harmless AI Draft, its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, and expenses arising out of or in any way connected with your access to or use of the Platform, your violation of these Terms, or your violation of any rights of a third party.',
      'This indemnification obligation includes claims arising from documents you create using the Platform, professional advice you provide based on AI-generated content, and any unauthorized use of your account. We will provide you with reasonable notice of any claim subject to indemnification.',
    ],
  },
  {
    title: '10. Governing Law & Dispute Resolution',
    content: [
      'These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles. Any disputes arising out of or relating to these Terms or the Platform shall be subject to the exclusive jurisdiction of the courts in New Delhi, India.',
      'Before initiating any legal proceedings, you agree to attempt to resolve any dispute with AI Draft through good-faith negotiation. If the dispute cannot be resolved within 30 days through negotiation, either party may pursue mediation through a recognized mediation center in New Delhi before initiating arbitration or litigation.',
    ],
  },
  {
    title: '11. Termination',
    content: [
      'We may suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any other reason at our sole discretion. Upon termination, your right to use the Platform will immediately cease. We will provide reasonable notice of termination except in cases involving fraud, security threats, or legal compliance requirements.',
      'Upon account termination, you may request deletion of your personal data in accordance with our Privacy Policy. AI-generated documents and content you created during your subscription period will remain accessible for 30 days after termination, after which they will be permanently deleted unless you request an extension.',
    ],
  },
]

export function TermsPage() {
  return (
    <PublicPageLayout title="Terms & Conditions">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-muted-foreground leading-relaxed">Last updated: May 30, 2025</p>
          <p className="text-muted-foreground leading-relaxed">
            Please read these Terms and Conditions carefully before using AI Draft. These Terms govern your access to and use of the AI Draft platform, website, and all associated services. By creating an account or using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms.
          </p>
        </div>

        {termsSections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            <div className="space-y-3">
              {section.content.map((paragraph, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3 mt-8">
          <h2 className="text-base font-semibold text-foreground">Contact for Terms Questions</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For any questions about these Terms and Conditions, please reach out through our <a href="/contact/" className="text-primary hover:underline">Contact Us</a> page.
          </p>
        </div>
      </div>
    </PublicPageLayout>
  )
}
