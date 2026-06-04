'use client';

import { DraftingView } from './drafting-view';
import { Baby } from 'lucide-react';

const config = {
  title: 'Guardianship Petition',
  description: 'Draft a petition for appointment of guardian under the Guardian and Wards Act.',
  icon: Baby,
  apiEndpoint: '/ai-family',
  apiTask: 'generateGuardian',
  module: 'family' as const,
  formFields: [
    { key: 'petitionerName', label: 'Petitioner Name', placeholder: 'Person seeking guardianship', half: true },
    { key: 'minorName', label: 'Minor Name', placeholder: 'Name of the minor child', half: true },
    { key: 'minorAge', label: 'Minor Age', placeholder: 'Age of minor', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Guardian and Wards court / District court', half: true },
    { key: 'guardianType', label: 'Type of Guardianship', placeholder: 'e.g., Custody, Property, Both' },
    { key: 'existingGuardian', label: 'Existing Guardian (if any)', placeholder: 'Current guardian details', half: true },
    { key: 'otherParent', label: 'Other Parent', placeholder: 'Name and status of other parent', half: true },
    { key: 'grounds', label: 'Grounds for Guardianship', placeholder: 'Why guardianship is needed - death, incapacity, welfare of minor...', type: 'textarea' },
    { key: 'minorWelfare', label: 'Welfare Considerations', placeholder: 'How guardianship benefits the minor', type: 'textarea' },
    { key: 'financialStatus', label: 'Financial Status', placeholder: 'Petitioner income and financial capacity', type: 'textarea' },
    { key: 'prayer', label: 'Prayer', placeholder: 'Specific relief sought', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function GuardianOpView() {
  return <DraftingView config={config} />;
}
