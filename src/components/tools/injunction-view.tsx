'use client';

import { DraftingView } from './drafting-view';
import { Ban } from 'lucide-react';

const config = {
  title: 'Injunction',
  description: 'Draft an application for temporary or permanent injunction.',
  icon: Ban,
  apiEndpoint: '/ai-civil',
  apiTask: 'generateInjunctionIA',
  module: 'civil' as const,
  requiredFields: ['applicantName', 'injunctionType'],
  formFields: [
    { key: 'applicantName', label: 'Applicant Name', placeholder: 'Name of the applicant', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'Name of the respondent', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'e.g., District Court', half: true },
    { key: 'suitNumber', label: 'Suit Number', placeholder: 'Main suit number if any', half: true },
    { key: 'injunctionType', label: 'Type of Injunction', placeholder: 'Temporary / Permanent / Mandatory / Prohibitory' },
    { key: 'facts', label: 'Facts for Injunction', placeholder: 'Why injunction is needed - urgency, irreparable harm...', type: 'textarea' as const },
    { key: 'grounds', label: 'Grounds', placeholder: 'Legal grounds for injunction...', type: 'textarea' as const },
    { key: 'prayer', label: 'Prayer / Relief Sought', placeholder: 'Specific injunction sought', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function InjunctionView() {
  return <DraftingView config={config} />;
}
