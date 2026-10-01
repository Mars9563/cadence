export function getCadenceDayEnd(currentTime: Date, dayEndTime: string): Date {
  const [hours, minutes, seconds] = dayEndTime.split(':').map(Number);

  const dayEnd = new Date(currentTime);

  dayEnd.setHours(hours, minutes, seconds ?? 0, 0);

  // If today's boundary has already passed,
  // the current Cadence day ends at tomorrow's boundary.
  if (dayEnd <= currentTime) {
    dayEnd.setDate(dayEnd.getDate() + 1);
  }

  return dayEnd;
}
