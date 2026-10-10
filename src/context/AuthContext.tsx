import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
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
  signIn: (emailOrStaffId: string, password: string) => Promise<void>;
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
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (!fbUser) {
          setFirebaseUser(null);
          setProfile(null);
          setRole(null);
          setAccountError(null);
          setLoading(false);
          return;
        }

        setFirebaseUser(fbUser);
        setAccountError(null);

        try {
          const userDocRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            console.warn(`User document for ${fbUser.uid} not found in Firestore. Creating default profile.`);
            const isAdmin = (fbUser.email || '').toLowerCase().includes('admin');
            const newUserDoc: Omit<User, 'uid'> = {
              name: isAdmin ? 'Admin User' : 'Staff Member',
              email: fbUser.email || '',
              phone: '',
              role: (isAdmin ? 'admin' : 'staff') as UserRole,
              active: true,
              staffId: isAdmin ? 'ADM001' : 'STF001',
              createdAt: new Date() as any,
            };
            await setDoc(userDocRef, newUserDoc).catch(() => {});
            const fullProfile: User = {
              uid: fbUser.uid,
              ...newUserDoc,
            };
            setProfile(fullProfile);
            setRole(fullProfile.role);
            setLoading(false);
            return;
          }

          const userData = userDocSnap.data() as Partial<User>;
          if (userData.active === false) {
            console.warn(`User ${fbUser.uid} is marked inactive.`);
            setAccountError('Your account has been deactivated. Please contact an administrator.');
            setProfile(null);
            setRole(null);
            setLoading(false);
            return;
          }

          if (!userData.role || (userData.role !== 'admin' && userData.role !== 'staff')) {
            console.warn(`User ${fbUser.uid} has invalid role: ${userData.role}`);
            setAccountError(`Invalid account role: ${userData.role || 'none'}. Please contact an administrator.`);
            setProfile(null);
            setRole(null);
            setLoading(false);
            return;
          }

          const resolvedProfile: User = {
            uid: fbUser.uid,
            email: userData.email || fbUser.email || '',
            name: userData.name || 'User',
            role: userData.role,
            staffId: userData.staffId || (userData.role === 'admin' ? 'ADM001' : 'STF001'),
            active: userData.active ?? true,
            phone: userData.phone || '',
            createdAt: userData.createdAt || (new Date() as any),
          };

          setProfile(resolvedProfile);
          setRole(resolvedProfile.role);
        } catch (error: any) {
          console.error('Error fetching user document from Firestore:', error);
          setAccountError(`Failed to load account profile: ${error?.message || error}`);
          setProfile(null);
          setRole(null);
        } finally {
          setLoading(false);
        }
      });
    } catch (authErr) {
      console.error('Error attaching auth listener:', authErr);
      setLoading(false);
    }

    return () => {
      try {
        unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const signIn = async (emailOrStaffId: string, password: string): Promise<void> => {
    const trimmedInput = emailOrStaffId.trim();
    const formattedEmail = trimmedInput.includes('@')
      ? trimmedInput
      : `${trimmedInput.toLowerCase()}@sabeena.test`;

    const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, password);
    const fbUser = userCredential.user;
    setFirebaseUser(fbUser);
    setAccountError(null);

    const userDocRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      const isAdmin = formattedEmail.toLowerCase().includes('admin');
      const newUserDoc: Omit<User, 'uid'> = {
        name: isAdmin ? 'Admin User' : 'Staff Member',
        email: fbUser.email || formattedEmail,
        phone: '',
        role: (isAdmin ? 'admin' : 'staff') as UserRole,
        active: true,
        staffId: isAdmin ? 'ADM001' : 'STF001',
        createdAt: new Date() as any,
      };
      await setDoc(userDocRef, newUserDoc).catch(() => {});
      const fullProfile: User = {
        uid: fbUser.uid,
        ...newUserDoc,
      };
      setProfile(fullProfile);
      setRole(fullProfile.role);
      return;
    }

    const userData = userDocSnap.data() as Partial<User>;
    if (userData.active === false) {
      await firebaseSignOut(auth).catch(() => {});
      setFirebaseUser(null);
      setProfile(null);
      setRole(null);
      const errMsg = 'Your account is currently deactivated. Please contact an admin.';
      Alert.alert('Login Failed', errMsg);
      throw new Error(errMsg);
    }

    const resolvedRole = (userData.role === 'admin' ? 'admin' : 'staff') as UserRole;
    const fullProfile: User = {
      uid: fbUser.uid,
      email: userData.email || fbUser.email || '',
      name: userData.name || 'User',
      role: resolvedRole,
      staffId: userData.staffId || (resolvedRole === 'admin' ? 'ADM001' : 'STF001'),
      active: userData.active ?? true,
      phone: userData.phone || '',
      createdAt: userData.createdAt || (new Date() as any),
    };

    setProfile(fullProfile);
    setRole(fullProfile.role);
  };

  const signOut = async (): Promise<void> => {
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
