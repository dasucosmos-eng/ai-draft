'use client';

import { DraftingView } from './drafting-view';
import { XCircle } from 'lucide-react';

const config = {
  title: 'Dismissal / Sist Application',
  description: 'Draft an application for dismissal of suit or sist (stay) of proceedings.',
  icon: XCircle,
  apiEndpoint: '/ai-civil',
  apiTask: 'generateDismiss',
  module: 'civil' as const,
  formFields: [
    { key: 'applicantName', label: 'Applicant Name', placeholder: 'Name of the applicant', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'Name of the respondent', half: true },
    { key: 'caseNumber', label: 'Case Number', placeholder: 'e.g., OS No. 456/2024', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Name of the court', half: true },
    { key: 'dismissalType', label: 'Type', placeholder: 'Dismissal of Suit / Sist of Proceedings / Withdrawal' },
    { key: 'grounds', label: 'Grounds', placeholder: 'Detailed grounds for dismissal/sist', type: 'textarea' },
    { key: 'facts', label: 'Relevant Facts', placeholder: 'Facts supporting the application', type: 'textarea' },
    { key: 'prayer', label: 'Prayer', placeholder: 'Specific relief sought from the court', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function DismissView() {
  return <DraftingView config={config} />;
}
