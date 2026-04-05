import {
  countByFollowUpFilter,
  getFollowUpState,
  matchesFollowUpFilter,
  sortByFollowUpDate,
} from './follow-up.utils';

describe('follow-up utils', () => {
  const now = new Date('2026-04-05T12:00:00.000Z');

  it('classifies follow-up dates into overdue, today, upcoming, or none', () => {
    expect(getFollowUpState('2026-04-04T20:00:00.000Z', now)).toBe('overdue');
    expect(getFollowUpState('2026-04-05T18:00:00.000Z', now)).toBe('today');
    expect(getFollowUpState('2026-04-06T09:00:00.000Z', now)).toBe('upcoming');
    expect(getFollowUpState('', now)).toBe('none');
  });

  it('matches and counts follow-up filters consistently', () => {
    const rows = [
      { name: 'Anna', followUpDate: '2026-04-04T20:00:00.000Z' },
      { name: 'Boris', followUpDate: '2026-04-05T18:00:00.000Z' },
      { name: 'Clara', followUpDate: '2026-04-06T09:00:00.000Z' },
      { name: 'Dmitri', followUpDate: '' },
    ];

    expect(matchesFollowUpFilter(rows[0].followUpDate, 'overdue', now)).toBe(true);
    expect(matchesFollowUpFilter(rows[1].followUpDate, 'today', now)).toBe(true);
    expect(matchesFollowUpFilter(rows[2].followUpDate, 'upcoming', now)).toBe(true);
    expect(countByFollowUpFilter(rows, 'overdue', now)).toBe(1);
    expect(countByFollowUpFilter(rows, 'today', now)).toBe(1);
    expect(countByFollowUpFilter(rows, 'upcoming', now)).toBe(1);
  });

  it('sorts dated leads first and keeps the earliest follow-up on top', () => {
    const leads = [
      { name: 'Mila', followUpDate: '' },
      { name: 'Bella', followUpDate: '2026-04-07T10:00:00.000Z' },
      { name: 'Anna', followUpDate: '2026-04-05T08:00:00.000Z' },
    ];

    expect([...leads].sort(sortByFollowUpDate).map(lead => lead.name)).toEqual(['Anna', 'Bella', 'Mila']);
  });
});
