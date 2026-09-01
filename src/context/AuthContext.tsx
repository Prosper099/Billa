import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { BusinessProfile, Invoice, Customer, ReminderLog } from '../types';

export interface GuestUser {
  uid: string;
  email: string;
  displayName: string;
  isGuest: boolean;
}

interface AuthContextType {
  user: User | GuestUser | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCloudSyncActive: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: (displayName?: string, email?: string) => void;
  signOutUser: () => Promise<void>;
  saveCloudProfile: (profile: Partial<BusinessProfile>) => Promise<void>;
  saveCloudInvoice: (invoice: Invoice) => Promise<void>;
  deleteCloudInvoice: (invoiceId: string) => Promise<void>;
  saveCloudCustomer: (customer: Customer) => Promise<void>;
  deleteCloudCustomer: (customerId: string) => Promise<void>;
  saveCloudReminderLog: (log: ReminderLog) => Promise<void>;
}

const FirebaseAuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'billa_auth_session_active_v1';
const GUEST_STORAGE_KEY = 'billa_guest_user_profile_v1';

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(() => {
    try {
      const saved = localStorage.getItem(GUEST_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isSessionActive, setIsSessionActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    } catch {}
    return false;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Monitor real Firebase auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setFirebaseUser(currentUser);
        if (currentUser) {
          setIsSessionActive(true);
          try {
            localStorage.setItem(AUTH_STORAGE_KEY, 'true');
          } catch {}
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn('Firebase onAuthStateChanged notice:', error?.message || error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const clearAuthError = () => setAuthError(null);

  const formatAuthError = (err: any): string => {
    const code = err?.code || '';
    const message = err?.message || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please check your credentials.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This email address is already registered. Please sign in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-in popup was closed before completing. Please try again.';
    }
    if (code === 'auth/network-request-failed' || message.includes('network')) {
      return 'Network error communicating with Firebase Auth. You can also click "Try Demo Workspace" for instant access.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'This preview domain is being authorized. You can sign in using Email/Password or Continue as Guest.';
    }
    return message || 'Authentication failed. Please try again or use Instant Guest Access.';
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      setIsSessionActive(true);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      } catch {}
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setAuthError(formatted);
      throw new Error(formatted);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, displayName?: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (displayName && cred.user) {
        await updateProfile(cred.user, { displayName }).catch((e) =>
          console.warn('Failed to update display name:', e)
        );
      }
      setIsSessionActive(true);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      } catch {}
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setAuthError(formatted);
      throw new Error(formatted);
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsSessionActive(true);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      } catch {}
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setAuthError(formatted);
      throw new Error(formatted);
    }
  };

  const continueAsGuest = (displayName?: string, email?: string) => {
    const guest: GuestUser = {
      uid: `guest_${Date.now()}`,
      email: email || 'guest@billa.local',
      displayName: displayName || 'Apex Studios',
      isGuest: true,
    };
    setGuestUser(guest);
    setIsSessionActive(true);
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    } catch {}
  };

  const signOutUser = async () => {
    setAuthError(null);
    try {
      if (firebaseUser) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn('Firebase sign out error:', err);
    }
    setGuestUser(null);
    setIsSessionActive(false);
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
  };

  // Active user object: either Firebase User or GuestUser
  const activeUser = firebaseUser || (isSessionActive ? guestUser : null);
  const isAuthenticated = !!activeUser || (isSessionActive && !isLoading);

  const saveCloudProfile = async (profile: Partial<BusinessProfile>) => {
    if (!firebaseUser) return;
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(
        userRef,
        {
          ...profile,
          userId: firebaseUser.uid,
          email: firebaseUser.email || profile.email || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firebase saveCloudProfile warning:', err);
    }
  };

  const saveCloudInvoice = async (invoice: Invoice) => {
    if (!firebaseUser) return;
    try {
      const invRef = doc(db, 'users', firebaseUser.uid, 'invoices', invoice.id);
      await setDoc(invRef, {
        ...invoice,
        userId: firebaseUser.uid,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firebase saveCloudInvoice warning:', err);
    }
  };

  const deleteCloudInvoice = async (invoiceId: string) => {
    if (!firebaseUser) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const invRef = doc(db, 'users', firebaseUser.uid, 'invoices', invoiceId);
      await deleteDoc(invRef);
    } catch (err) {
      console.warn('Firebase deleteCloudInvoice warning:', err);
    }
  };

  const saveCloudCustomer = async (customer: Customer) => {
    if (!firebaseUser) return;
    try {
      const custRef = doc(db, 'users', firebaseUser.uid, 'customers', customer.id);
      await setDoc(custRef, {
        ...customer,
        userId: firebaseUser.uid,
      });
    } catch (err) {
      console.warn('Firebase saveCloudCustomer warning:', err);
    }
  };

  const deleteCloudCustomer = async (customerId: string) => {
    if (!firebaseUser) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const custRef = doc(db, 'users', firebaseUser.uid, 'customers', customerId);
      await deleteDoc(custRef);
    } catch (err) {
      console.warn('Firebase deleteCloudCustomer warning:', err);
    }
  };

  const saveCloudReminderLog = async (log: ReminderLog) => {
    if (!firebaseUser) return;
    try {
      const logRef = doc(db, 'users', firebaseUser.uid, 'reminders', log.id);
      await setDoc(logRef, {
        ...log,
        userId: firebaseUser.uid,
      });
    } catch (err) {
      console.warn('Firebase saveCloudReminderLog warning:', err);
    }
  };

  return (
    <FirebaseAuthContext.Provider
      value={{
        user: activeUser,
        firebaseUser,
        isAuthenticated,
        isLoading,
        isCloudSyncActive: !!firebaseUser,
        authError,
        clearAuthError,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        continueAsGuest,
        signOutUser,
        saveCloudProfile,
        saveCloudInvoice,
        deleteCloudInvoice,
        saveCloudCustomer,
        deleteCloudCustomer,
        saveCloudReminderLog,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
  }
  return context;
};

