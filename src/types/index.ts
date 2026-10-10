import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'staff';

export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  staffId?: string;
  role: UserRole;
  active: boolean;
  createdAt: Timestamp;
}

export type CustomerStatus =
  | 'new'
  | 'assigned'
  | 'contacted'
  | 'interested'
  | 'converted'
  | 'not_interested';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  productInterest?: string;
  source?: string;
  notes?: string;
  status: CustomerStatus;
  assignedTo: string | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  company?: string;
  address?: string;
  city?: string;
  instagram?: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  assignedTo: string;
  assignedBy: string;
  status: TaskStatus;
  outcome: string | null;
  lastRemarks: string | null;
  nextFollowUp: Timestamp | null;
  priority: TaskPriority;
  dueDate: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type InteractionOutcome =
  | 'no_answer'
  | 'call_back_later'
  | 'interested'
  | 'not_interested'
  | 'converted';

export interface Interaction {
  id: string;
  taskId: string;
  customerId: string;
  staffId: string;
  outcome: InteractionOutcome;
  remarks: string;
  nextFollowUp: Timestamp | null;
  createdAt: Timestamp;
}

// Additional legacy / extended lead management types
export type LeadSource = 'IndiaMART' | 'Walk-in' | 'Referral' | 'WhatsApp' | 'Website';
export type LeadStatus = 'New Lead' | 'In Progress' | 'Won' | 'Lost';
export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface LeadLocation {
  address: string;
  lat?: number;
  lng?: number;
}

export interface Lead {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  source: LeadSource;
  receivedDate: Timestamp;
  requirementSummary: string;
  products: string[];
  estimatedValue: number;
  status: LeadStatus;
  priority: LeadPriority;
  assignedTo: string;
  assignedToName: string;
  followUpAt: Timestamp | null;
  notes?: string;
  attachments?: string[];
  location?: LeadLocation;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ActivityType = 'note' | 'status' | 'reassign' | 'call';

export interface Activity {
  id: string;
  title: string;
  note?: string;
  tag?: string;
  authorId: string;
  authorName: string;
  type: ActivityType;
  createdAt: Timestamp;
}
