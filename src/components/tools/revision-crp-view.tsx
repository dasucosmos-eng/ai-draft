'use client';

import { DraftingView } from './drafting-view';
import { RefreshCcw } from 'lucide-react';

const config = {
  title: 'Revision / CRP',
  description: 'File a Criminal Revision Petition (CRP) against lower court order.',
  icon: RefreshCcw,
  apiEndpoint: '/ai-criminal',
  apiTask: 'generateCRP',
  module: 'criminal' as const,
  formFields: [
    { key: 'petitionerName', label: 'Petitioner Name', placeholder: 'Name of the petitioner', half: true },
    { key: 'respondentState', label: 'Respondent (State)', placeholder: 'State / Respondent name', half: true },
    { key: 'lowerCourt', label: 'Lower Court', placeholder: 'Court whose order is challenged', half: true },
    { key: 'revisionCourt', label: 'Revisional Court', placeholder: 'e.g., Sessions Court / High Court', half: true },
    { key: 'impugnedOrderDate', label: 'Order Date', placeholder: '', type: 'date', half: true },
    { key: 'caseNumber', label: 'Original Case No.', placeholder: 'Case number in lower court', half: true },
    { key: 'impugnedOrder', label: 'Impugned Order', placeholder: 'Summary of the order being revised', type: 'textarea' },
    { key: 'grounds', label: 'Grounds for Revision', placeholder: 'Why revision is sought...', type: 'textarea' },
    { key: 'facts', label: 'Relevant Facts', placeholder: 'Brief facts of the case', type: 'textarea' },
    { key: 'prayer', label: 'Prayer', placeholder: 'What relief is prayed for', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function RevisionCrpView() {
  return <DraftingView config={config} />;
}
