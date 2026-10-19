'use client';

import { PendingDaySettings } from '../PendingDaySettings';
import { SectionHeader } from '../SettingsModal';
import { DayBoundarySection } from './DayBoundarySection';
import { TimeZoneSection } from './TimeZoneSection';

/** Settings panel: pending change, time zone, day end. */
export function TimeAndDaySection() {
  return (
    <div className="grid gap-7">
      <SectionHeader
        title="Time & day"
        description="Your time zone and when your day ends decide what “today” is. A change starts when your current day is over, so no day is ever reopened or skipped early."
      />
      <PendingDaySettings />
      <TimeZoneSection />
      <DayBoundarySection />
    </div>
  );
}
