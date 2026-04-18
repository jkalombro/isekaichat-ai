import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, db } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, limit, query } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { AppStatus } from '../types';

export type GeminiModel = 'gemini-3.1-flash-lite-preview' | 'gemini-3-flash-preview';

interface AuthContextType {
  user: (User & { geminiKey?: string | null }) | null;
  loading: boolean;
  isAuthReady: boolean;
  selectedModel: GeminiModel;
  setSelectedModel: (model: GeminiModel) => void;
  appStatus: AppStatus | null;
  loadingStatus: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAuthReady: false,
  selectedModel: 'gemini-3-flash-preview',
  setSelectedModel: () => {},
  appStatus: null,
  loadingStatus: true
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<(User & { geminiKey?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-3-flash-preview');
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'appstatus'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setAppStatus(snapshot.docs[0].data() as AppStatus);
      } else {
        setAppStatus({ isMaintenanceMode: false });
      }
      setLoadingStatus(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Reset model to Flash on login for stability
        setSelectedModel('gemini-3-flash-preview');
        
        // Sync user to Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        let geminiKey = null;

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            geminiKey: null,
            createdAt: serverTimestamp(),
          });
        } else {
          geminiKey = userSnap.data().geminiKey || null;
        }
        
        // Combine Firebase Auth user with Firestore data
        const combinedUser = Object.assign(firebaseUser, { geminiKey });
        setUser(combinedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthReady, selectedModel, setSelectedModel, appStatus, loadingStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
