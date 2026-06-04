'use client';

import { DraftingView } from './drafting-view';
import { Landmark } from 'lucide-react';

const config = {
  title: 'Transfer of Property Act Suit',
  description: 'Draft a suit under the Transfer of Property Act.',
  icon: Landmark,
  apiEndpoint: '/ai-draft',
  documentType: 'Suit under Transfer of Property Act',
  module: 'civil' as const,
  formFields: [
    { key: 'plaintiffName', label: 'Plaintiff Name', placeholder: 'Name of the plaintiff', half: true },
    { key: 'defendantName', label: 'Defendant Name', placeholder: 'Name of the defendant', half: true },
    { key: 'propertyAddress', label: 'Property Address', placeholder: 'Full address of the property', half: true },
    { key: 'propertyType', label: 'Property Type', placeholder: 'e.g., Residential, Commercial, Agricultural', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Court name and jurisdiction', half: true },
    { key: 'filingDate', label: 'Filing Date', placeholder: '', type: 'date' as const, half: true },
    { key: 'details', label: 'Case Details', placeholder: 'Describe the transaction, agreement, dispute...', type: 'textarea' as const },
    { key: 'facts', label: 'Material Facts', placeholder: 'Detailed facts of the case', type: 'textarea' as const },
    { key: 'reliefSought', label: 'Relief Sought', placeholder: 'e.g., Specific performance, Declaration, Possession', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function TpActView() {
  return <DraftingView config={config} />;
}
