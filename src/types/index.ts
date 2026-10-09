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

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  city?: string;
  instagram?: string;
  createdAt: Timestamp;
}

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
