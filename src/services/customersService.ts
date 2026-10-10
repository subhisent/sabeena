import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from '../constants';
import { Customer, CustomerStatus } from '../types';

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  productInterest?: string;
  source?: string;
  notes?: string;
  status?: CustomerStatus;
  assignedTo?: string | null;
  createdBy: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  productInterest?: string;
  source?: string;
  notes?: string;
  status?: CustomerStatus;
  assignedTo?: string | null;
}

/**
 * Create a new customer in Firestore.
 */
export async function createCustomer(input: CreateCustomerInput): Promise<string> {
  try {
    const customersRef = collection(db, COLLECTIONS.CUSTOMERS);
    const docRef = await addDoc(customersRef, {
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email ? input.email.trim() : null,
      productInterest: input.productInterest || 'General Inquiry',
      source: input.source || 'Direct',
      notes: input.notes || '',
      status: input.status || 'new',
      assignedTo: input.assignedTo || null,
      createdBy: input.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err: any) {
    console.error('Error in createCustomer:', err);
    throw new Error(`Failed to create customer: ${err?.message || err}`);
  }
}

/**
 * Update an existing customer.
 */
export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput
): Promise<void> {
  try {
    const customerDocRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
    const updateData: Record<string, any> = {
      ...input,
      updatedAt: serverTimestamp(),
    };
    // Strip undefined
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    await updateDoc(customerDocRef, updateData);
  } catch (err: any) {
    console.error(`Error updating customer ${customerId}:`, err);
    throw new Error(`Failed to update customer: ${err?.message || err}`);
  }
}

/**
 * Fetch a customer by ID.
 */
export async function getCustomer(customerId: string): Promise<Customer | null> {
  try {
    const customerDocRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
    const snap = await getDoc(customerDocRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      productInterest: data.productInterest || undefined,
      source: data.source || undefined,
      notes: data.notes || undefined,
      status: data.status || 'new',
      assignedTo: data.assignedTo || null,
      createdBy: data.createdBy,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    };
  } catch (err: any) {
    console.error(`Error getting customer ${customerId}:`, err);
    throw new Error(`Failed to fetch customer: ${err?.message || err}`);
  }
}

/**
 * List all customers sorted by newest first.
 */
export async function listCustomers(): Promise<Customer[]> {
  try {
    const customersRef = collection(db, COLLECTIONS.CUSTOMERS);
    const q = query(customersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || undefined,
        productInterest: data.productInterest || undefined,
        source: data.source || undefined,
        notes: data.notes || undefined,
        status: data.status || 'new',
        assignedTo: data.assignedTo || null,
        createdBy: data.createdBy || '',
        createdAt: data.createdAt as Timestamp,
        updatedAt: data.updatedAt as Timestamp,
      };
    });
  } catch (err: any) {
    console.error('Error in listCustomers:', err);
    throw new Error(`Failed to list customers: ${err?.message || err}`);
  }
}
