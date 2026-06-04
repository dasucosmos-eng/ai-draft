'use client';

import { DraftingView } from './drafting-view';
import { FileCode } from 'lucide-react';

const config = {
  title: 'CRLMP',
  description: 'Draft a Criminal Leave to Appeal / Criminal Miscellaneous Petition.',
  icon: FileCode,
  apiEndpoint: '/ai-criminal',
  apiTask: 'generateCRLMP',
  module: 'criminal' as const,
  formFields: [
    { key: 'petitionerName', label: 'Petitioner Name', placeholder: 'Name of petitioner', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'State / Respondent', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Court where CRLMP is filed', half: true },
    { key: 'lowerCourt', label: 'Lower Court', placeholder: 'Court whose order is challenged', half: true },
    { key: 'caseNumber', label: 'Case Number', placeholder: 'Original case number', half: true },
    { key: 'impugnedOrderDate', label: 'Order Date', placeholder: '', type: 'date', half: true },
    { key: 'petitionType', label: 'Type of Petition', placeholder: 'e.g., Leave to Appeal, Interim Relief, Quashing, Transfer' },
    { key: 'impugnedOrder', label: 'Impugned Order Summary', placeholder: 'Summary of the order being challenged', type: 'textarea' },
    { key: 'grounds', label: 'Grounds', placeholder: 'Grounds for the petition...', type: 'textarea' },
    { key: 'facts', label: 'Relevant Facts', placeholder: 'Brief facts', type: 'textarea' },
    { key: 'prayer', label: 'Prayer', placeholder: 'Specific relief sought', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function CrlmpView() {
  return <DraftingView config={config} />;
}
