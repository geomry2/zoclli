export type FollowUpFilter = 'all' | 'overdue' | 'today' | 'upcoming';
export type FollowUpState = Exclude<FollowUpFilter, 'all'> | 'none';

interface FollowUpLike {
  followUpDate: string;
  name: string;
}

export function getFollowUpState(followUpDate: string, now = new Date()): FollowUpState {
  if (!followUpDate) return 'none';

  const parsed = new Date(followUpDate);
  if (Number.isNaN(parsed.getTime())) return 'none';

  const startOfToday = new Date(now.toDateString());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  if (parsed < startOfToday) return 'overdue';
  if (parsed >= startOfToday && parsed < endOfToday) return 'today';
  return 'upcoming';
}

export function matchesFollowUpFilter(followUpDate: string, filter: FollowUpFilter, now = new Date()): boolean {
  if (filter === 'all') return true;
  return getFollowUpState(followUpDate, now) === filter;
}

export function countByFollowUpFilter<T extends { followUpDate: string }>(
  items: T[],
  filter: Exclude<FollowUpFilter, 'all'>,
  now = new Date(),
): number {
  return items.filter(item => matchesFollowUpFilter(item.followUpDate, filter, now)).length;
}

export function sortByFollowUpDate<T extends FollowUpLike>(left: T, right: T): number {
  const leftDate = parseFollowUpDate(left.followUpDate);
  const rightDate = parseFollowUpDate(right.followUpDate);

  if (leftDate !== null && rightDate !== null && leftDate !== rightDate) {
    return leftDate - rightDate;
  }
  if (leftDate !== null && rightDate === null) return -1;
  if (leftDate === null && rightDate !== null) return 1;

  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}

function parseFollowUpDate(value: string): number | null {
  if (!value) return null;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}
