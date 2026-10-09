import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Lead } from '../types';

const now = Date.now();
const oneHourAgo = new Timestamp(Math.floor((now - 3600 * 1000 * 3) / 1000), 0);
const twoHoursFromNow = new Timestamp(Math.floor((now + 3600 * 1000 * 2) / 1000), 0);
const tomorrow = new Timestamp(Math.floor((now + 3600 * 1000 * 24) / 1000), 0);
const threeDaysLater = new Timestamp(Math.floor((now + 3600 * 1000 * 72) / 1000), 0);
const pastDate = new Timestamp(Math.floor((now - 3600 * 1000 * 48) / 1000), 0);

export const SAMPLE_LEADS: Lead[] = [
  {
    id: 'lead-1',
    customerId: 'cust-1',
    customerName: 'Vetri Constructions',
    phone: '+91 98401 23456',
    source: 'IndiaMART',
    receivedDate: pastDate,
    requirementSummary: 'Anna Nagar · Industrial band sealer (2 units)',
    products: ['Industrial Band Sealer', 'Silicone sealants'],
    estimatedValue: 180000,
    status: 'In Progress',
    priority: 'Urgent',
    assignedTo: 'STF001',
    assignedToName: 'Sanjay A',
    followUpAt: oneHourAgo,
    location: { address: 'Plot 42, 2nd Avenue, Anna Nagar, Chennai' },
    createdBy: 'admin',
    createdAt: pastDate,
    updatedAt: pastDate,
  },
  {
    id: 'lead-2',
    customerId: 'cust-2',
    customerName: 'Arul Paints & Hardware',
    phone: '+91 98840 98765',
    source: 'Walk-in',
    receivedDate: pastDate,
    requirementSummary: 'Ambattur · Continuous band sealer with nitrogen flushing',
    products: ['Continuous Band Sealer', 'Acrylic sealants'],
    estimatedValue: 95000,
    status: 'New Lead',
    priority: 'High',
    assignedTo: 'STF001',
    assignedToName: 'Sanjay A',
    followUpAt: twoHoursFromNow,
    location: { address: 'SIDCO Industrial Estate, Ambattur, Chennai' },
    createdBy: 'admin',
    createdAt: pastDate,
    updatedAt: pastDate,
  },
  {
    id: 'lead-3',
    customerId: 'cust-3',
    customerName: 'Kaveri Agro Foods',
    phone: '+91 94441 55667',
    source: 'WhatsApp',
    receivedDate: pastDate,
    requirementSummary: 'Madhavaram · Vacuum packaging sealer for grain bags',
    products: ['Vacuum Packaging Sealer', 'Polyurethane sealants'],
    estimatedValue: 240000,
    status: 'In Progress',
    priority: 'Medium',
    assignedTo: 'STF001',
    assignedToName: 'Sanjay A',
    followUpAt: tomorrow,
    location: { address: 'GNT Road, Madhavaram, Chennai' },
    createdBy: 'admin',
    createdAt: pastDate,
    updatedAt: pastDate,
  },
  {
    id: 'lead-4',
    customerId: 'cust-4',
    customerName: 'Supreme Chemicals',
    phone: '+91 97910 11223',
    source: 'Website',
    receivedDate: pastDate,
    requirementSummary: 'Guindy · Heavy duty pedal sealer 24 inch',
    products: ['Heavy Duty Pedal Sealer', 'Silicone sealants'],
    estimatedValue: 42000,
    status: 'Lost',
    priority: 'Low',
    assignedTo: 'STF001',
    assignedToName: 'Sanjay A',
    followUpAt: null,
    location: { address: 'Industrial Estate, Guindy, Chennai' },
    createdBy: 'admin',
    createdAt: pastDate,
    updatedAt: pastDate,
  },
  {
    id: 'lead-5',
    customerId: 'cust-5',
    customerName: 'Shree Buildtech',
    phone: '+91 98412 88990',
    source: 'Referral',
    receivedDate: pastDate,
    requirementSummary: 'Tambaram · Silicone structural glazing sealants',
    products: ['Silicone sealants', 'Pneumatic Applicator Gun'],
    estimatedValue: 125000,
    status: 'In Progress',
    priority: 'High',
    assignedTo: 'STF001',
    assignedToName: 'Sanjay A',
    followUpAt: threeDaysLater,
    location: { address: 'GST Road, Tambaram, Chennai' },
    createdBy: 'admin',
    createdAt: pastDate,
    updatedAt: pastDate,
  },
  {
    id: 'lead-6',
    customerId: 'cust-6',
    customerName: 'Chennai Decor & Glass',
    phone: '+91 94440 33445',
    source: 'IndiaMART',
    receivedDate: pastDate,
    requirementSummary: 'T. Nagar · Acrylic weatherproofing sealants',
    products: ['Acrylic sealants', 'Continuous Band Sealer'],
    estimatedValue: 310000,
    status: 'Won',
    priority: 'Medium',
    assignedTo: 'STF001',
    assignedToName: 'Sanjay A',
    followUpAt: null,
    location: { address: 'Usman Road, T. Nagar, Chennai' },
    createdBy: 'admin',
    createdAt: pastDate,
    updatedAt: pastDate,
  },
  {
    id: 'lead-7',
    customerId: 'cust-7',
    customerName: 'Metro Projects Ltd',
    phone: '+91 98845 66778',
    source: 'Referral',
    receivedDate: pastDate,
    requirementSummary: 'Guindy · Expansion joint PU sealant',
    products: ['PU Sealant', 'Industrial Band Sealer'],
    estimatedValue: 450000,
    status: 'In Progress',
    priority: 'Urgent',
    assignedTo: 'STF001',
    assignedToName: 'Sanjay A',
    followUpAt: oneHourAgo,
    location: { address: 'Mount Road, Guindy, Chennai' },
    createdBy: 'admin',
    createdAt: pastDate,
    updatedAt: pastDate,
  },
];

export interface UseMyLeadsResult {
  leads: Lead[];
  loading: boolean;
  error: string | null;
}

export function useMyLeads(): UseMyLeadsResult {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>(SAMPLE_LEADS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLeads(SAMPLE_LEADS);
      setLoading(false);
      return;
    }

    try {
      const leadsRef = collection(db, 'leads');
      const q =
        user.role === 'admin'
          ? query(leadsRef)
          : query(
              leadsRef,
              where('assignedTo', 'in', [user.uid, user.staffId || user.uid])
            );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const loadedLeads: Lead[] = snapshot.docs.map((doc) => ({
              ...(doc.data() as Omit<Lead, 'id'>),
              id: doc.id,
            }));
            setLeads(loadedLeads);
          } else {
            setLeads(SAMPLE_LEADS);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Firestore leads snapshot listener warning (using sample leads):', err.message);
          setLeads(SAMPLE_LEADS);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.warn('Error setting up useMyLeads listener:', err);
      setLeads(SAMPLE_LEADS);
      setLoading(false);
    }
  }, [user]);

  return { leads, loading, error };
}

export default useMyLeads;
