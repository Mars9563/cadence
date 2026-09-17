export type Profile = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;

  /**
   * Time at which the user's Cadence day rolls over.
   *
   * Default:
   * 04:00:00
   *
   * Example:
   * With 04:00 as the boundary:
   *
   * 2026-09-10 03:59 -> Cadence date 2026-09-09
   * 2026-09-10 04:00 -> Cadence date 2026-09-10
   */
  dayEndTime: string;

  createdAt: string;
  updatedAt: string;
};
