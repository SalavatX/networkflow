import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface BlockedContextType {
  isBlocked: boolean;
  checkBlocked: () => void;
}

const BlockedContext = createContext<BlockedContextType>({
  isBlocked: false,
  checkBlocked: () => {}
});

export function useBlocked() {
  return useContext(BlockedContext);
}

interface BlockedProviderProps {
  children: ReactNode;
}

export function BlockedProvider({ children }: BlockedProviderProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const { userData, loading } = useAuth();
  
  const checkBlocked = () => {
    if (!loading && userData) {
      setIsBlocked(userData.blocked === true);
    } else {
      setIsBlocked(false);
    }
  };
  
  useEffect(() => {
    checkBlocked();
  }, [userData, loading]);
  
  const value = {
    isBlocked,
    checkBlocked
  };
  
  return (
    <BlockedContext.Provider value={value}>
      {children}
    </BlockedContext.Provider>
  );
} 