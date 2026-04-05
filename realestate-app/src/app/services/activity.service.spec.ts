import { ActivityEntry, ActivityService } from './activity.service';

describe('ActivityService', () => {
  it('loads persisted activity entries from localStorage', () => {
    const stored: ActivityEntry[] = [
      {
        id: '1',
        action: 'created',
        entityType: 'client',
        name: 'Anna Stone',
        timestamp: '2026-04-05T09:00:00.000Z',
      },
    ];
    localStorage.setItem('zoclli_activity', JSON.stringify(stored));

    const service = new ActivityService();

    expect(service.activities()).toEqual(stored);
  });

  it('recovers from malformed storage data', () => {
    localStorage.setItem('zoclli_activity', '{invalid');

    const service = new ActivityService();

    expect(service.activities()).toEqual([]);
  });

  it('prepends new activity, persists it, and caps the list at 50 items', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-05T10:30:00.000Z'));
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'generated-id') } as Crypto);

    const existing = Array.from({ length: 50 }, (_, index) => ({
      id: `old-${index}`,
      action: 'updated' as const,
      entityType: 'lead' as const,
      name: `Lead ${index}`,
      timestamp: `2026-04-04T${String(index % 24).padStart(2, '0')}:00:00.000Z`,
    }));
    localStorage.setItem('zoclli_activity', JSON.stringify(existing));

    const service = new ActivityService();
    service.log('created', 'client', 'New Client');

    expect(service.activities()).toHaveLength(50);
    expect(service.activities()[0]).toEqual({
      id: 'generated-id',
      action: 'created',
      entityType: 'client',
      name: 'New Client',
      timestamp: '2026-04-05T10:30:00.000Z',
    });
    expect(service.activities().at(-1)?.id).toBe('old-48');
    expect(JSON.parse(localStorage.getItem('zoclli_activity') ?? '[]')).toHaveLength(50);
  });
});
