'use client';

import { DraftingView } from './drafting-view';
import { Reply } from 'lucide-react';

const config = {
  title: 'Counter-Affidavit / Rejoinder',
  description: 'Draft a counter-affidavit or rejoinder in response to the opposite party\'s affidavit.',
  icon: Reply,
  apiEndpoint: '/ai-civil',
  apiTask: 'generateCounter',
  module: 'civil' as const,
  formFields: [
    { key: 'deponentName', label: 'Deponent Name', placeholder: 'Name of the person swearing the counter', half: true },
    { key: 'designation', label: 'Designation', placeholder: 'e.g., Managing Director, Proprietor', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'Name of the respondent filing counter', half: true },
    { key: 'petitionerName', label: 'Petitioner Name', placeholder: 'Name of the original petitioner', half: true },
    { key: 'caseNumber', label: 'Case Number', placeholder: 'e.g., WP No. 123/2024', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Name of the court', half: true },
    { key: 'originalRelief', label: 'Original Relief Sought', placeholder: 'What the petitioner originally sought', type: 'textarea' },
    { key: 'rejectionGrounds', label: 'Grounds for Rejection', placeholder: 'Why the original petition/affidavit should be opposed', type: 'textarea' },
    { key: 'facts', label: 'Counter Facts', placeholder: 'Factual rebuttal of the claims made in the original affidavit', type: 'textarea' },
    { key: 'supportingDocuments', label: 'Supporting Documents', placeholder: 'List documents attached in support', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function CounterAffidavitView() {
  return <DraftingView config={config} />;
}
