import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from '../constants';
import { User } from '../types';

/**
 * Fetch a single user profile from Firestore by UID.
 */
export async function getUserProfile(uid: string): Promise<User | null> {
  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      uid: snap.id,
      name: data.name || 'User',
      email: data.email || '',
      phone: data.phone || '',
      role: data.role || 'staff',
      active: data.active ?? true,
      staffId: data.staffId,
      createdAt: data.createdAt,
    } as User;
  } catch (err: any) {
    console.error('Error in getUserProfile:', err);
    throw new Error(`Failed to load user profile: ${err?.message || err}`);
  }
}

/**
 * List all active staff members.
 */
export async function listStaff(): Promise<User[]> {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where('role', '==', 'staff'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        name: data.name || 'Staff Member',
        email: data.email || '',
        phone: data.phone || '',
        role: 'staff',
        active: data.active ?? true,
        staffId: data.staffId,
        createdAt: data.createdAt,
      } as User;
    });
  } catch (err: any) {
    console.error('Error in listStaff:', err);
    throw new Error(`Failed to list staff: ${err?.message || err}`);
  }
}
