import React, { createContext, useContext, useState } from 'react';
import type { MeResponse } from '@/types/api';

interface UserContextValue {
  user: MeResponse | null;
  firstLoginKey: string | null;   // raw account key from first login — shown once
  dismissFirstLoginKey: () => void;
  setAuth: (user: MeResponse) => void;
  clearAuth: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [firstLoginKey, setFirstLoginKey] = useState<string | null>(null);

  const setAuth = (u: MeResponse) => {
    if (u.raw_account_key) {
      setFirstLoginKey(u.raw_account_key);
    }
    setUser({ ...u, raw_account_key: null });
  };

  const clearAuth = () => {
    setUser(null);
    setFirstLoginKey(null);
  };

  const dismissFirstLoginKey = () => setFirstLoginKey(null);

  return (
    <UserContext.Provider value={{ user, firstLoginKey, dismissFirstLoginKey, setAuth, clearAuth }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
