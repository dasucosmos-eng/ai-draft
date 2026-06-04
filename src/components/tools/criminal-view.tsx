'use client';

import { DraftingView } from './drafting-view';
import { AlertTriangle } from 'lucide-react';

const config = {
  title: 'Criminal Law',
  description: 'Draft criminal law documents, bail applications, and petitions. Upload a document or describe the case — AI extracts, fills & drafts automatically.',
  icon: AlertTriangle,
  apiEndpoint: '/ai-criminal',
  apiTask: 'generateDocument',
  module: 'criminal' as const,
  formFields: [
    { key: 'documentType', label: 'Document Type', placeholder: 'e.g., Bail Application, FIR, Charge Sheet Analysis' },
    { key: 'accusedName', label: 'Accused Name', placeholder: 'Name of accused', half: true },
    { key: 'victimName', label: 'Victim / Complainant', placeholder: 'Name of victim/complainant', half: true },
    { key: 'firNumber', label: 'FIR Number', placeholder: 'e.g., FIR No. 456/2024', half: true },
    { key: 'policeStation', label: 'Police Station', placeholder: 'Name of PS', half: true },
    { key: 'sectionsCharged', label: 'Sections Charged', placeholder: 'e.g., 302, 201, 34 IPC', half: true },
    { key: 'offense', label: 'Offense Type', placeholder: 'Type of offense', half: true },
    { key: 'facts', label: 'Case Facts', placeholder: 'Describe the facts of the case...', type: 'textarea' },
    { key: 'grounds', label: 'Grounds / Defense', placeholder: 'Grounds for bail or defense strategy...', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function CriminalView() {
  return <DraftingView config={config} />;
}
