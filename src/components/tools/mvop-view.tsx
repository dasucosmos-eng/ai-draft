'use client';

import { DraftingView } from './drafting-view';
import { Car } from 'lucide-react';

const config = {
  title: 'MVOP - Motor Vehicle Claim',
  description: 'Draft a Motor Vehicle Original Petition for accident compensation.',
  icon: Car,
  apiEndpoint: '/ai-family',
  apiTask: 'generateMVOP',
  module: 'family' as const,
  formFields: [
    { key: 'claimantName', label: 'Claimant Name', placeholder: 'Name of claimant/applicant', half: true },
    { key: 'age', label: 'Claimant Age', placeholder: 'Age', half: true },
    { key: 'occupation', label: 'Occupation', placeholder: 'e.g., Farmer, Driver, Business', half: true },
    { key: 'income', label: 'Monthly Income (₹)', placeholder: 'Monthly income', half: true },
    { key: 'accidentDate', label: 'Date of Accident', placeholder: '', type: 'date' as const, half: true },
    { key: 'accidentPlace', label: 'Place of Accident', placeholder: 'Location', half: true },
    { key: 'vehicleType', label: 'Vehicle Type', placeholder: 'e.g., Car, Truck, Two-wheeler', half: true },
    { key: 'vehicleNumber', label: 'Vehicle Number', placeholder: 'Registration number', half: true },
    { key: 'insuranceCompany', label: 'Insurance Company', placeholder: 'Name of insurer', half: true },
    { key: 'policeStation', label: 'Police Station', placeholder: 'PS where FIR lodged', half: true },
    { key: 'firNumber', label: 'FIR Number', placeholder: 'FIR number' },
    { key: 'injuries', label: 'Injuries / Fatalities', placeholder: 'Describe injuries sustained or death', type: 'textarea' as const },
    { key: 'facts', label: 'Accident Facts', placeholder: 'How the accident occurred...', type: 'textarea' as const },
    { key: 'claimAmount', label: 'Claim Amount (₹)', placeholder: 'Total compensation claimed', type: 'number' as const },
    { key: 'losses', label: 'Loss Details', placeholder: 'Medical expenses, loss of income, disability, funeral expenses...', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function MvopView() {
  return <DraftingView config={config} />;
}
