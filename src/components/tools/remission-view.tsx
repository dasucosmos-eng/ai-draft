'use client';

import { DraftingView } from './drafting-view';
import { Clock } from 'lucide-react';

const config = {
  title: 'Remission Application',
  description: 'Draft an application for remission of sentence.',
  icon: Clock,
  apiEndpoint: '/ai-draft',
  documentType: 'Application for Remission of Sentence',
  module: 'criminal' as const,
  formFields: [
    { key: 'applicantName', label: 'Applicant/Convict Name', placeholder: 'Name of the convicted person', half: true },
    { key: 'age', label: 'Age', placeholder: 'Age', half: true },
    { key: 'prisonName', label: 'Prison Name', placeholder: 'Current prison', half: true },
    { key: 'courtName', label: 'Convicting Court', placeholder: 'Court that convicted', half: true },
    { key: 'caseNumber', label: 'Case Number', placeholder: 'Case number', half: true },
    { key: 'convictionDate', label: 'Date of Conviction', placeholder: '', type: 'date' as const, half: true },
    { key: 'sentenceAwarded', label: 'Sentence Awarded', placeholder: 'e.g., 10 years RI + fine ₹5000' },
    { key: 'sentenceServed', label: 'Sentence Served', placeholder: 'Duration already served' },
    { key: 'grounds', label: 'Grounds for Remission', placeholder: 'Good conduct, age, health, family circumstances...', type: 'textarea' as const },
    { key: 'behavior', label: 'Prison Conduct', placeholder: 'Details of good behavior, rehabilitation efforts', type: 'textarea' as const },
    { key: 'prayer', label: 'Prayer', placeholder: 'Specific relief sought', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function RemissionView() {
  return <DraftingView config={config} />;
}
