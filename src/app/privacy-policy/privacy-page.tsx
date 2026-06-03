'use client'

import { PublicPageLayout } from '@/components/shared/public-page-layout'
import { Shield, Database, UserCheck, Lock, Eye, Globe, Server, FileText } from 'lucide-react'

const sections = [
  {
    title: '1. Information We Collect',
    icon: Database,
    content: [
      'AI Draft collects information that you provide directly to us when you create an account, use our services, or communicate with us. This includes your name, email address, phone number, professional details such as Bar Council registration number, law firm name, city of practice, and areas of legal specialization. We collect this information to provide you with personalized legal document drafting, case research, and client management services.',
      'When you use AI Draft, we automatically collect certain technical information about your device and usage. This includes your IP address, browser type, operating system, pages visited, features used, time spent on the platform, and interaction patterns with our AI tools. This data helps us improve our services, fix bugs, and enhance user experience.',
      'We also collect documents that you upload for AI analysis, drafting, or research purposes. These documents are processed temporarily and are not permanently stored beyond the duration necessary to provide the requested service. All uploaded legal documents are encrypted during transmission and processing.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    icon: UserCheck,
    content: [
      'Your information is used to deliver and improve our AI-powered legal document platform. Specifically, we use your data to: create and manage your account, provide AI document drafting and research services, manage your client and case files, process subscription payments and billing, send important notifications about your account and services, provide customer support, and analyze platform usage to improve features and user experience.',
      'We may use your professional details to personalize your experience on AI Draft, such as suggesting relevant case law from your practice area, recommending document templates suited to your specialization, and connecting you with relevant legal resources. You can update your preferences at any time in your account settings.',
      'AI Draft does not sell, rent, or trade your personal information to third parties for marketing purposes. We only share your data with service providers who assist in operating our platform (such as cloud hosting and payment processors) and who are contractually obligated to maintain the confidentiality and security of your information.',
    ],
  },
  {
    title: '3. Data Security & Encryption',
    icon: Lock,
    content: [
      'We implement industry-leading security measures to protect your data. All data transmissions between your device and AI Draft are encrypted using 256-bit SSL/TLS encryption. Your account password is hashed and salted using industry-standard algorithms and is never stored in plain text. We support two-factor authentication for enhanced account security.',
      'Your uploaded legal documents and generated drafts are encrypted at rest using AES-256 encryption. Our infrastructure is hosted on SOC 2 Type II certified data centers with 24/7 monitoring, intrusion detection systems, and regular security audits. Access to production systems is strictly controlled and logged.',
      'We conduct regular penetration testing and vulnerability assessments to identify and address potential security risks. In the event of a data breach, we will notify affected users within 72 hours as required by applicable data protection laws and provide guidance on protective measures.',
    ],
  },
  {
    title: '4. Data Retention & Deletion',
    icon: FileText,
    content: [
      'We retain your account information for as long as your account is active or as needed to provide you with our services. If you decide to delete your account, we will remove your personal information within 30 days of your request, except where retention is required by law for legal or regulatory compliance purposes.',
      'Uploaded documents and AI-generated drafts are retained for 90 days after creation, after which they are automatically deleted from our active systems. You can manually delete any document or draft at any time from your account. Once deleted, data is irrecoverably purged from our backup systems within 14 days.',
      'Anonymized usage statistics and aggregated analytics data may be retained indefinitely for product improvement purposes. This data cannot be used to identify individual users and contains no personal information.',
    ],
  },
  {
    title: '5. Cookies & Tracking Technologies',
    icon: Eye,
    content: [
      'AI Draft uses essential cookies to maintain your session, remember your preferences, and ensure the platform functions correctly. These cookies are necessary for the basic operation of our services and cannot be disabled. We also use analytics cookies to understand how users interact with our platform, which helps us improve our features and user experience.',
      'We do not use advertising cookies or sell advertising space on our platform. Third-party analytics tools we use are configured to anonymize IP addresses and comply with applicable privacy regulations. You can manage your cookie preferences through your browser settings, though disabling essential cookies may affect platform functionality.',
    ],
  },
  {
    title: '6. Third-Party Services',
    icon: Globe,
    content: [
      'AI Draft integrates with select third-party services to deliver our platform features. These include cloud infrastructure providers for hosting, payment processors for subscription management, and AI service providers for document analysis and drafting. Each third-party service provider is carefully vetted and contractually bound to protect your data in accordance with applicable privacy laws.',
      'We do not share your personal information with third parties except as described in this policy, or when required by law, court order, or government regulation. In such cases, we will notify you unless legally prohibited from doing so, and we will limit the disclosure to the minimum information required.',
    ],
  },
  {
    title: '7. Your Rights & Choices',
    icon: Shield,
    content: [
      'Under applicable Indian data protection laws, you have the right to access your personal data, request correction of inaccurate information, request deletion of your data, object to or restrict certain processing activities, and request data portability. You can exercise these rights by contacting us at privacy@aidraft.bond.',
      'You can update or delete your account information at any time through your account settings. If you wish to completely delete your account and all associated data, please contact our support team and we will process your request within 30 days. We may retain certain information as required by law for legal and regulatory compliance.',
    ],
  },
  {
    title: '8. Compliance with Indian Laws',
    icon: Server,
    content: [
      'AI Draft is designed and operated in compliance with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023 of India. All data processing activities are conducted in accordance with applicable Indian data protection regulations.',
      'Our data processing activities for legal professionals are recognized as legitimate business purposes under Indian law. We maintain appropriate security safeguards and have designated a Data Protection Officer who can be reached at privacy@aidraft.bond for any privacy-related concerns.',
    ],
  },
]

export function PrivacyPage() {
  return (
    <PublicPageLayout title="Privacy Policy">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-muted-foreground leading-relaxed">
            Last updated: May 30, 2025
          </p>
          <p className="text-muted-foreground leading-relaxed">
            AI Draft (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered legal document drafting, research, and case management platform hosted at aidraft.bond. By accessing or using AI Draft, you agree to the practices described in this Privacy Policy.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We understand that as legal professionals, the confidentiality of your data is paramount. The documents you draft, the cases you research, and the client information you manage on our platform are treated with the highest level of security and confidentiality. We have designed our systems and processes to meet the exacting standards expected by the legal industry in India.
          </p>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <section.icon className="size-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            </div>
            <div className="space-y-3 pl-11">
              {section.content.map((paragraph, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </div>
        ))}

        {/* Contact for Privacy */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3 mt-8">
          <h2 className="text-base font-semibold text-foreground">Privacy Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out through our <a href="/contact/" className="text-primary hover:underline">Contact Us</a> page.
          </p>
          <div className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/20 space-y-1">
            <p>Ai Draft — Privacy Team</p>
            <p>Prabhu Dasu Palli, Founder</p>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  )
}
