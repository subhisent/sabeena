import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { User, UserRole } from '../types';
import { COLLECTIONS } from '../constants';

export interface AuthContextType {
  user: User | null;
  profile: User | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole | null;
  loading: boolean;
  accountError: string | null;
  signIn: (emailOrStaffId: string, password: string, personaHint?: 'admin' | 'staff') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeDoc = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      unsubscribeDoc();

      if (!fbUser) {
        console.log('[ROLE-DEBUG] Auth state changed: No authenticated Firebase user.');
        setFirebaseUser(null);
        setProfile(null);
        setRole(null);
        setAccountError(null);
        setLoading(false);
        return;
      }

      console.log(`[ROLE-DEBUG] onAuthStateChanged active user: uid=${fbUser.uid}, email=${fbUser.email}`);
      setFirebaseUser(fbUser);
      setAccountError(null);

      try {
        const userDocRef = doc(db, COLLECTIONS.USERS, fbUser.uid);

        // Real-time listener on the user's Firestore document
        unsubscribeDoc = onSnapshot(
          userDocRef,
          async (snap) => {
            const exists = snap.exists();
            console.log(`[ROLE-DEBUG] Snapshot for users/${fbUser.uid} -> exists=${exists}`);

            if (!exists) {
              console.log(`[ROLE-DEBUG] users/${fbUser.uid} NOT FOUND in Firestore. Signing out.`);
              await firebaseSignOut(auth).catch(() => {});
              setFirebaseUser(null);
              setProfile(null);
              setRole(null);
              setAccountError('Account not set up. Contact the admin.');
              setLoading(false);
              return;
            }

            const userData = snap.data() as Partial<User>;
            console.log('[ROLE-DEBUG] Raw Firestore user data:', JSON.stringify(userData));

            if (userData.active === false) {
              console.log(`[ROLE-DEBUG] users/${fbUser.uid} active is false. Signing out.`);
              await firebaseSignOut(auth).catch(() => {});
              setFirebaseUser(null);
              setProfile(null);
              setRole(null);
              setAccountError('Account not set up. Contact the admin.');
              setLoading(false);
              return;
            }

            const roleValue = userData.role;
            console.log(`[ROLE-DEBUG] Extracted role: "${roleValue}" (type: ${typeof roleValue})`);

            if (roleValue !== 'admin' && roleValue !== 'staff') {
              console.log(`[ROLE-DEBUG] Invalid role "${roleValue}". Signing out.`);
              await firebaseSignOut(auth).catch(() => {});
              setFirebaseUser(null);
              setProfile(null);
              setRole(null);
              setAccountError('Account not set up. Contact the admin.');
              setLoading(false);
              return;
            }

            const resolvedRole: UserRole = roleValue;
            const resolvedProfile: User = {
              uid: fbUser.uid,
              email: userData.email || fbUser.email || '',
              name: userData.name || (resolvedRole === 'admin' ? 'Administrator' : 'Staff Member'),
              role: resolvedRole,
              staffId: userData.staffId || (resolvedRole === 'admin' ? 'ADM001' : 'STF001'),
              active: userData.active ?? true,
              phone: userData.phone || '',
              createdAt: userData.createdAt || (new Date() as any),
            };

            console.log(`[ROLE-DEBUG] AuthContext role set to "${resolvedRole}".`);
            setProfile(resolvedProfile);
            setRole(resolvedRole);
            setLoading(false);
          },
          async (err) => {
            console.error('[ROLE-DEBUG] Firestore snapshot error:', err);
            await firebaseSignOut(auth).catch(() => {});
            setFirebaseUser(null);
            setProfile(null);
            setRole(null);
            setAccountError('Account not set up. Contact the admin.');
            setLoading(false);
          }
        );
      } catch (error: any) {
        console.error('[ROLE-DEBUG] Error attaching user document listener:', error);
        await firebaseSignOut(auth).catch(() => {});
        setFirebaseUser(null);
        setProfile(null);
        setRole(null);
        setAccountError('Account not set up. Contact the admin.');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDoc();
    };
  }, []);

  const signIn = async (
    emailOrStaffId: string,
    password: string,
    personaHint?: 'admin' | 'staff'
  ): Promise<void> => {
    const trimmedInput = emailOrStaffId.trim();
    const formattedEmail = trimmedInput.includes('@')
      ? trimmedInput
      : `${trimmedInput.toLowerCase()}@sabeena.test`;

    console.log(`[ROLE-DEBUG] signIn attempt: input="${emailOrStaffId}", formattedEmail="${formattedEmail}", personaHint="${personaHint}"`);

    const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, password);
    const fbUser = userCredential.user;
    console.log(`[ROLE-DEBUG] Firebase Auth sign-in successful: uid=${fbUser.uid}, email=${fbUser.email}`);
    setAccountError(null);

    // Strictly read users/{uid} from Firestore - NEVER write or overwrite
    const userDocRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    const exists = userDocSnap.exists();
    console.log(`[ROLE-DEBUG] signIn getDoc users/${fbUser.uid} -> exists=${exists}`);

    if (!exists) {
      console.log(`[ROLE-DEBUG] users/${fbUser.uid} does NOT exist in Firestore. Signing out.`);
      await firebaseSignOut(auth).catch(() => {});
      setFirebaseUser(null);
      setProfile(null);
      setRole(null);
      throw new Error('Account not set up. Contact the admin.');
    }

    const userData = userDocSnap.data() as Partial<User>;
    console.log('[ROLE-DEBUG] signIn Firestore user data:', JSON.stringify(userData));

    if (userData.active === false) {
      console.log(`[ROLE-DEBUG] users/${fbUser.uid} is inactive. Signing out.`);
      await firebaseSignOut(auth).catch(() => {});
      setFirebaseUser(null);
      setProfile(null);
      setRole(null);
      throw new Error('Account not set up. Contact the admin.');
    }

    const roleValue = userData.role;
    console.log(`[ROLE-DEBUG] signIn role from Firestore: "${roleValue}" (type: ${typeof roleValue})`);

    if (roleValue !== 'admin' && roleValue !== 'staff') {
      console.log(`[ROLE-DEBUG] signIn role is invalid ("${roleValue}"). Signing out.`);
      await firebaseSignOut(auth).catch(() => {});
      setFirebaseUser(null);
      setProfile(null);
      setRole(null);
      throw new Error('Account not set up. Contact the admin.');
    }

    // Persona hint check
    if (personaHint && roleValue !== personaHint) {
      console.log(`[ROLE-DEBUG] Persona mismatch: chosen toggle="${personaHint}", Firestore role="${roleValue}". Signing out.`);
      await firebaseSignOut(auth).catch(() => {});
      setFirebaseUser(null);
      setProfile(null);
      setRole(null);
      throw new Error(`This account is not a ${personaHint} account`);
    }

    const resolvedRole: UserRole = roleValue;
    const fullProfile: User = {
      uid: fbUser.uid,
      email: userData.email || fbUser.email || '',
      name: userData.name || (resolvedRole === 'admin' ? 'Administrator' : 'Staff Member'),
      role: resolvedRole,
      staffId: userData.staffId || (resolvedRole === 'admin' ? 'ADM001' : 'STF001'),
      active: userData.active ?? true,
      phone: userData.phone || '',
      createdAt: userData.createdAt || (new Date() as any),
    };

    console.log(`[ROLE-DEBUG] signIn complete. Setting role to "${resolvedRole}".`);
    setFirebaseUser(fbUser);
    setProfile(fullProfile);
    setRole(resolvedRole);
  };

  const signOut = async (): Promise<void> => {
    console.log('[ROLE-DEBUG] signOut called.');
    await firebaseSignOut(auth).catch(() => {});
    setFirebaseUser(null);
    setProfile(null);
    setRole(null);
    setAccountError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: profile,
        profile,
        firebaseUser,
        role,
        loading,
        accountError,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
