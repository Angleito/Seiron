'use client';

import { useEffect } from 'react';
import { hydrateStores } from '../stores/rootStore';

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  // Hydrate stores on mount
  useEffect(() => {
    hydrateStores();
  }, []);
  
  // Zustand stores don't need a provider, but we can use this
  // component for store initialization and hydration
  return <>{children}</>;
}