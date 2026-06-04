'use client';

import { DraftingView } from './drafting-view';
import { FileText } from 'lucide-react';

const config = {
  title: 'Written Statement',
  description: 'Generate a written statement in response to a plaint.',
  icon: FileText,
  apiEndpoint: '/ai-civil',
  apiTask: 'generateWS',
  module: 'civil' as const,
  formFields: [
    { key: 'plaintiffName', label: 'Plaintiff Name', placeholder: 'Name of the plaintiff', half: true },
    { key: 'defendantName', label: 'Defendant Name', placeholder: 'Your client name', half: true },
    { key: 'caseNumber', label: 'Suit Number', placeholder: 'e.g., CS No. 123/2024', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Court name', half: true },
    { key: 'plaintText', label: 'Plaint Text / Allegations', placeholder: 'Copy/paste the plaint allegations here...', type: 'textarea' as const },
    { key: 'defense', label: 'Defense / Counter Arguments', placeholder: 'Describe the defense strategy and counter arguments...', type: 'textarea' as const },
    { key: 'additionalFacts', label: 'Additional Facts', placeholder: 'Any additional facts supporting defense', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function WrittenStatementView() {
  return <DraftingView config={config} />;
}
