'use client';

import { getProfile } from '@/api/profile';
import {
  useSetCadenceDayEnd,
  useSetCurrentDateTime,
  useSetUser,
} from '@/store/selectors';
import { ReactNode, useEffect } from 'react';
import { getCadenceDayEnd } from '@/lib/cadenceDay';

interface AppBootstrapProps {
  children: ReactNode;
}

export function AppBootstrap({ children }: AppBootstrapProps) {
  const setUser = useSetUser();
  const setCurrentDateTime = useSetCurrentDateTime();
  const setCadenceDayEnd = useSetCadenceDayEnd();

  useEffect(() => {
    async function loadProfile() {
      const profile = await getProfile();

      const now = new Date();

      setCurrentDateTime(now);
      setUser(profile);

      setCadenceDayEnd(getCadenceDayEnd(now, profile.dayEndTime));
    }

    loadProfile();
  }, [setUser, setCurrentDateTime, setCadenceDayEnd]);

  return <>{children}</>;
}
