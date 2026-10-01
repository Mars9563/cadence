'use client';
import { getProfile } from '@/api/profile';
import { useSetUser } from '@/store/selectors';
import { ReactNode, useEffect } from 'react';

interface AppBootstrapProps {
  children: ReactNode;
}
export function AppBootstrap({ children }: AppBootstrapProps) {
  const setUser = useSetUser();

  useEffect(() => {
    async function loadProfile() {
      const profile = await getProfile();
      console.log(profile);
      setUser(profile);
    }

    loadProfile();
  }, [setUser]);
  return <>{children}</>;
}
