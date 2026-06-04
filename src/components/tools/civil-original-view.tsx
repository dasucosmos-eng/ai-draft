'use client';

import { DraftingView } from './drafting-view';
import { Landmark } from 'lucide-react';

const config = {
  title: 'Civil Original Side',
  description: 'Draft civil suit documents and pleadings. Upload a document or describe the case — AI handles everything autonomously.',
  icon: Landmark,
  apiEndpoint: '/ai-civil',
  apiTask: 'generateDocument',
  module: 'civil' as const,
  formFields: [
    { key: 'documentType', label: 'Document Type', placeholder: 'e.g., Plaint, Written Statement, Injunction, Specific Performance' },
    { key: 'plaintiffName', label: 'Plaintiff', placeholder: 'Name of plaintiff', half: true },
    { key: 'defendantName', label: 'Defendant', placeholder: 'Name of defendant', half: true },
    { key: 'courtName', label: 'Court', placeholder: 'Court name and jurisdiction', half: true },
    { key: 'valuation', label: 'Valuation', placeholder: 'Suit valuation (₹)', type: 'number', half: true },
    { key: 'causeOfAction', label: 'Cause of Action', placeholder: 'When and how the cause of action arose...', type: 'textarea' },
    { key: 'facts', label: 'Case Facts', placeholder: 'Describe the facts of the case...', type: 'textarea' },
    { key: 'reliefSought', label: 'Relief Sought', placeholder: 'What relief do you seek from the court?', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function CivilOriginalView() {
  return <DraftingView config={config} />;
}
