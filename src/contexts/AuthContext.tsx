import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { setUserOnline, setUserOffline } from '../services/onlineStatusService';

interface UserData {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  followers?: string[];
  following?: string[];
  isAdmin?: boolean;
  approved?: boolean;
  createdAt?: string;
  blocked?: boolean;
  blockedReason?: string;
  blockedAt?: any;
  blockedUntil?: any;
  blockedBy?: string;
  adminName?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (currentUser) {
        if (document.visibilityState === 'visible') {
          void setUserOnline(currentUser.uid);
        } else {
          void setUserOffline(currentUser.uid);
        }
      }
    };
    
    const handleBeforeUnload = () => {
      if (currentUser) {
        void setUserOffline(currentUser.uid);
      }
    };
    
    if (currentUser) {
      void setUserOnline(currentUser.uid);
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      const intervalId = setInterval(() => {
        if (document.visibilityState === 'visible' && currentUser) {
          void setUserOnline(currentUser.uid);
        }
      }, 60000);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        clearInterval(intervalId);
        
        if (currentUser) {
          void setUserOffline(currentUser.uid);
        }
      };
    }
    
    return () => {};
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userDocData = userDoc.data() as UserData;
            setUserData(userDocData);
            setIsAdmin(userDocData.isAdmin === true);
            setIsApproved(userDocData.approved === true);
          }
        } catch (error) {
          console.error('Ошибка при получении данных пользователя:', error);
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
        setIsApproved(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    if (currentUser) {
      await setUserOffline(currentUser.uid);
    }
    await firebaseSignOut(auth);
  };

  const value = {
    currentUser,
    userData,
    loading,
    isAdmin,
    isApproved,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 