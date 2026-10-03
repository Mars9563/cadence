'use client';

import { getProfile } from '@/api/profile';
import {
  useFetchItems,
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
  const fetchItems = useFetchItems();

  useEffect(() => {
    async function loadProfile() {
      const profile = await getProfile();

      const now = new Date();

      setCurrentDateTime(now);
      setUser(profile);

      setCadenceDayEnd(getCadenceDayEnd(now, profile.dayEndTime));
    }

    // Items load in parallel with the profile. The slice stores its own
    // loading/error state, so nothing here needs to await or catch it.
    void fetchItems();
    void loadProfile();
  }, [setUser, setCurrentDateTime, setCadenceDayEnd, fetchItems]);

  return <>{children}</>;
}
