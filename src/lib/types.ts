export interface CaseItem {
  id: string;
  caseNumber?: string;
  title: string;
  description?: string;
  caseType: string;
  subType?: string;
  status: string;
  priority: string;
  jurisdiction?: string;
  courtName?: string;
  judgeName?: string;
  filingDate?: string;
  nextHearing?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  accusedName?: string;
  accusedPhone?: string;
  accusedEmail?: string;
  accusedAddress?: string;
  victimNames?: string[];
  opposingParty?: string;
  opposingPartyPhone?: string;
  opposingPartyEmail?: string;
  opposingPartyAddress?: string;
  clientAdvocate?: string;
  opposingAdvocate?: string;
  firNumber?: string;
  policeStation?: string;
  crrNumber?: string;
  causeOfAction?: string;
  reliefSought?: string;
  underSections?: string[];
  opposingCounsel?: string;
  tasksCount?: number;
  documentsCount?: number;
  upcomingEvents?: number;
  aiInsights?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  alternatePhone?: string;
  category?: string;
  referenceSource?: string;
  panNumber?: string;
  company?: string;
  companyType?: string;
  gstNumber?: string;
  accused?: string[];
  victims?: string[];
  caseIds?: string[];
  documents?: any[];
  notes?: string;
  tags?: string[];
  fees?: any[];
  activities?: any[];
  importantDates?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  barCouncilNumber: string;
  firmName: string;
  city: string;
  firmAddress: string;
  practiceArea: string;
  stampLine: string;
  logoUrl: string;
  isComplete: boolean;
  completedAt: string | null;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  eventDate: string;
  isCompleted: boolean;
  isMilestone: boolean;
  reminderSet: boolean;
  caseId?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignee?: string;
  taskType?: string;
  caseId?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  category: string;
  content?: string;
  summary?: string;
  metadata?: any;
  caseId?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  description?: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  caseTitle?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

export interface SubscriptionData {
  plan?: string;
  status?: string;
  currentPeriodEnd?: string;
  features?: string[];
  [key: string]: any;
}

export interface UserDataPayload {
  cases?: CaseItem[];
  documents?: DocumentItem[];
  tasks?: TaskItem[];
  timelineEvents?: TimelineEvent[];
  invoices?: InvoiceItem[];
  clients?: Client[];
  profile?: ProfileData;
  executionMatters?: any[];
  civilMatters?: any[];
  chatMessages?: ChatMessage[];
  subscription?: SubscriptionData;
}
