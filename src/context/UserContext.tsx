import React, { createContext, useContext, useState } from 'react';
import type { MeResponse } from '@/types/api';

interface UserContextValue {
  user: MeResponse | null;
  setAuth: (user: MeResponse) => void;
  clearAuth: () => void;
}

const STORAGE_KEY = 'mgmt_user';

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as MeResponse) : null;
    } catch {
      return null;
    }
  });

  const setAuth = (u: MeResponse) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const clearAuth = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <UserContext.Provider value={{ user, setAuth, clearAuth }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
