import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { auth, db } from '../services/firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (emailOrStaffId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          console.warn(`User document for ${fbUser.uid} not found.`);
          await firebaseSignOut(auth);
          setUser(null);
          Alert.alert('Access Denied', 'User profile not found in system.');
          setLoading(false);
          return;
        }

        const userData = userDocSnap.data() as Omit<User, 'uid'> & { uid?: string };
        if (userData.active === false) {
          console.warn(`User ${fbUser.uid} is inactive.`);
          await firebaseSignOut(auth);
          setUser(null);
          Alert.alert('Access Denied', 'Your account is inactive. Please contact an administrator.');
          setLoading(false);
          return;
        }

        setUser({
          ...userData,
          uid: fbUser.uid,
        } as User);
      } catch (error) {
        console.error('Error fetching user document:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (emailOrStaffId: string, password: string): Promise<void> => {
    const trimmedInput = emailOrStaffId.trim();
    const formattedEmail = trimmedInput.includes('@')
      ? trimmedInput
      : `${trimmedInput.toLowerCase()}@sabeena.test`;

    const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, password);
    const fbUser = userCredential.user;

    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      await firebaseSignOut(auth);
      setUser(null);
      const errMsg = 'User profile does not exist in the database.';
      Alert.alert('Login Failed', errMsg);
      throw new Error(errMsg);
    }

    const userData = userDocSnap.data() as Omit<User, 'uid'> & { uid?: string };
    if (userData.active === false) {
      await firebaseSignOut(auth);
      setUser(null);
      const errMsg = 'Your account is currently deactivated. Please contact an admin.';
      Alert.alert('Login Failed', errMsg);
      throw new Error(errMsg);
    }

    setUser({
      ...userData,
      uid: fbUser.uid,
    } as User);
  };

  const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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
