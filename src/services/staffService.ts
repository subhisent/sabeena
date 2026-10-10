import { initializeApp, deleteApp } from 'firebase/app';
// @ts-ignore: getReactNativePersistence is provided by Firebase Auth
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { db } from './firebase';
import { User } from '../types';

export interface StaffMemberWithMetrics {
  user: User;
  leadsCount: number;
  closedCount: number;
  openCount: number;
}

export interface CreateStaffParams {
  name: string;
  email: string;
  phone: string;
  password?: string;
  role?: 'admin' | 'staff';
  staffId?: string;
}

/**
 * Creates a new Firebase Auth user and Firestore User document
 * without signing out the current active Administrator session.
 */
export async function createStaffAccount(params: CreateStaffParams): Promise<{ uid: string }> {
  const {
    name,
    email,
    phone,
    password = 'Password@123',
    role = 'staff',
    staffId,
  } = params;

  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  // Create an isolated secondary Firebase app instance
  const secondaryAppName = `SecondaryAuth_${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email.trim().toLowerCase(),
      password
    );

    const uid = userCredential.user.uid;

    // Immediately sign out the secondary auth instance so it never persists
    await signOut(secondaryAuth);

    // Save profile to Firestore using the primary db instance
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      active: true,
      staffId: staffId || `STF${Math.floor(100 + Math.random() * 900)}`,
      createdAt: serverTimestamp(),
    });

    return { uid };
  } finally {
    // Clean up isolated app
    try {
      await deleteApp(secondaryApp);
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Toggles a staff member's active status in Firestore
 */
export async function toggleStaffActiveStatus(uid: string, active: boolean): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    active,
  });
}

/**
 * Fetches all users along with calculated live lead metrics from Firestore
 */
export async function fetchStaffWithMetrics(): Promise<StaffMemberWithMetrics[]> {
  const usersRef = collection(db, 'users');
  const usersSnap = await getDocs(usersRef);

  const leadsRef = collection(db, 'leads');
  const leadsSnap = await getDocs(leadsRef);

  const results: StaffMemberWithMetrics[] = usersSnap.docs.map((d) => {
    const data = d.data();
    const user: User = {
      uid: d.id,
      name: data.name || 'Unnamed',
      email: data.email || '',
      phone: data.phone || '',
      staffId: data.staffId,
      role: data.role || 'staff',
      active: data.active !== false,
      createdAt: data.createdAt || Timestamp.now(),
    };

    let leadsCount = 0;
    let closedCount = 0;
    let openCount = 0;

    leadsSnap.docs.forEach((ld) => {
      const ldata = ld.data();
      if (ldata.assignedTo === user.uid) {
        leadsCount++;
        if (ldata.status === 'Won' || ldata.status === 'Lost') {
          closedCount++;
        } else {
          openCount++;
        }
      }
    });

    return {
      user,
      leadsCount,
      closedCount,
      openCount,
    };
  });

  return results;
}
