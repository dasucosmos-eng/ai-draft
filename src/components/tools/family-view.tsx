'use client';

import { DraftingView } from './drafting-view';
import { Heart } from 'lucide-react';

const config = {
  title: 'Family Law',
  description: 'Draft family law petitions, applications, and agreements. Upload a document or describe the issue — AI handles everything autonomously.',
  icon: Heart,
  apiEndpoint: '/ai-family',
  apiTask: 'generateDocument',
  module: 'family' as const,
  formFields: [
    { key: 'documentType', label: 'Document Type', placeholder: 'e.g., Divorce Petition, Maintenance Application, Custody Application' },
    { key: 'petitionerName', label: 'Petitioner Name', placeholder: 'Name of petitioner', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'Name of respondent', half: true },
    { key: 'marriageDate', label: 'Marriage Date', placeholder: 'Date of marriage', type: 'date', half: true },
    { key: 'children', label: 'Children', placeholder: 'Names and ages of children', half: true },
    { key: 'facts', label: 'Case Facts', placeholder: 'Describe the situation, background, and grounds...', type: 'textarea' },
    { key: 'reliefSought', label: 'Relief Sought', placeholder: 'What relief do you seek?', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function FamilyView() {
  return <DraftingView config={config} />;
}
