'use client';

import { DraftingView } from './drafting-view';
import { AlertOctagon } from 'lucide-react';

const config = {
  title: 'Domestic Violence Case',
  description: 'Draft a petition under the Protection of Women from Domestic Violence Act.',
  icon: AlertOctagon,
  apiEndpoint: '/ai-family',
  apiTask: 'generateDOP',
  module: 'family' as const,
  requiredFields: ['complainantName', 'respondentName'],
  formFields: [
    { key: 'complainantName', label: 'Complainant Name', placeholder: 'Aggrieved person', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'Respondent (husband / relative)', half: true },
    { key: 'complainantAge', label: 'Complainant Age', placeholder: 'Age', half: true },
    { key: 'relationship', label: 'Relationship', placeholder: 'e.g., Wife, Daughter-in-law, Sister', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Magistrate court / Family court' },
    { key: 'residenceAddress', label: 'Shared Household Address', placeholder: 'Address of shared household' },
    { key: 'children', label: 'Children Details', placeholder: 'Minor children details' },
    { key: 'natureOfViolence', label: 'Nature of Violence', placeholder: 'Physical, emotional, economic, sexual...', type: 'textarea' as const },
    { key: 'incidents', label: 'Specific Incidents', placeholder: 'Describe incidents of domestic violence...', type: 'textarea' as const },
    { key: 'reliefSought', label: 'Relief Sought', placeholder: 'Protection order, residence order, maintenance, custody...', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function DopView() {
  return <DraftingView config={config} />;
}
