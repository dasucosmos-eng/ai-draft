'use client';

import { DraftingView } from './drafting-view';
import { UsersRound } from 'lucide-react';

const config = {
  title: 'Succession Certificate',
  description: 'Draft a petition for grant of Succession Certificate.',
  icon: UsersRound,
  apiEndpoint: '/ai-family',
  apiTask: 'generateSuccession',
  module: 'family' as const,
  requiredFields: ['petitionerName', 'deceasedName'],
  formFields: [
    { key: 'petitionerName', label: 'Petitioner Name', placeholder: 'Name of applicant', half: true },
    { key: 'deceasedName', label: 'Deceased Name', placeholder: 'Name of deceased person', half: true },
    { key: 'deceasedDateOfDeath', label: 'Date of Death', placeholder: '', type: 'date' as const, half: true },
    { key: 'relationship', label: 'Relationship with Deceased', placeholder: 'e.g., Son, Daughter, Wife', half: true },
    { key: 'deceasedAddress', label: 'Deceased Last Address', placeholder: 'Last known address of deceased' },
    { key: 'courtName', label: 'Court Name', placeholder: 'Court name and jurisdiction' },
    { key: 'otherHeirs', label: 'Other Legal Heirs', placeholder: 'Names and relationships of other surviving legal heirs', type: 'textarea' as const },
    { key: 'properties', label: 'Properties / Debts', placeholder: 'List of properties, bank accounts, debts of deceased...', type: 'textarea' as const },
    { key: 'facts', label: 'Relevant Facts', placeholder: 'When and how the deceased died, family details...', type: 'textarea' as const },
    { key: 'prayer', label: 'Prayer', placeholder: 'What is being sought', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function SuccessionView() {
  return <DraftingView config={config} />;
}
