'use client';

import { DraftingView } from './drafting-view';
import { Paperclip } from 'lucide-react';

const config = {
  title: 'Attachments / IA',
  description: 'Draft an application for attachment of property or interim application.',
  icon: Paperclip,
  apiEndpoint: '/ai-execution',
  apiTask: 'generateEA',
  module: 'execution' as const,
  formFields: [
    { key: 'applicantName', label: 'Applicant Name', placeholder: 'Decree Holder', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'Judgment Debtor', half: true },
    { key: 'epNumber', label: 'EP Number', placeholder: 'Execution Petition number', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Execution court', half: true },
    { key: 'decreeNumber', label: 'Decree Number', placeholder: 'Original decree', half: true },
    { key: 'decreeAmount', label: 'Decree Amount (₹)', placeholder: 'Amount', type: 'number' as const, half: true },
    { key: 'propertyDetails', label: 'Property Details', placeholder: 'Address, type, registration details of property to be attached...', type: 'textarea' as const },
    { key: 'grounds', label: 'Grounds for Attachment', placeholder: 'Why attachment is needed...', type: 'textarea' as const },
    { key: 'prayer', label: 'Prayer', placeholder: 'Specific prayer for property attachment', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function AttachmentsIaView() {
  return <DraftingView config={config} />;
}
