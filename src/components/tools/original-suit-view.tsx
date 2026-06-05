'use client';

import { DraftingView } from './drafting-view';
import { Scale } from 'lucide-react';

const config = {
  title: 'Original Suit / Plaint',
  description: 'Generate a plaint for filing a civil original suit.',
  icon: Scale,
  apiEndpoint: '/ai-civil',
  apiTask: 'generatePlaint',
  module: 'civil' as const,
  requiredFields: ['plaintiffName', 'defendantName'],
  formFields: [
    { key: 'plaintiffName', label: 'Plaintiff Name', placeholder: 'e.g., Mrs. Sunita Sharma', half: true },
    { key: 'plaintiffAddress', label: 'Plaintiff Address', placeholder: 'Full address', half: true },
    { key: 'defendantName', label: 'Defendant Name', placeholder: 'e.g., ABC Corporation', half: true },
    { key: 'defendantAddress', label: 'Defendant Address', placeholder: 'Full address', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'e.g., District Court, Mumbai', half: true },
    { key: 'filingDate', label: 'Filing Date', placeholder: '', type: 'date' as const, half: true },
    { key: 'subjectMatter', label: 'Subject Matter', placeholder: 'e.g., Recovery of money / Specific performance' },
    { key: 'causeOfAction', label: 'Cause of Action', placeholder: 'Brief description of the cause of action', type: 'textarea' as const },
    { key: 'matterFacts', label: 'Material Facts', placeholder: 'Describe the facts of the case in detail...', type: 'textarea' as const },
    { key: 'reliefSought', label: 'Relief Sought', placeholder: 'What relief do you seek?', type: 'textarea' as const },
    { key: 'jurisdiction', label: 'Jurisdiction', placeholder: 'e.g., Civil Suit, pecuniary jurisdiction', half: true },
    { key: 'valuation', label: 'Valuation (₹)', placeholder: 'e.g., 500000', type: 'number' as const, half: true },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function OriginalSuitView() {
  return <DraftingView config={config} />;
}
