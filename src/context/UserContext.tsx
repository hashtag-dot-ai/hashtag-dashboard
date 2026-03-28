import React, { createContext, useContext, useState } from 'react';
import type { MeResponse } from '@/types/api';

interface UserContextValue {
  user: MeResponse | null;
  setAuth: (user: MeResponse) => void;
  clearAuth: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);

  const setAuth = (u: MeResponse) => setUser(u);
  const clearAuth = () => setUser(null);

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
