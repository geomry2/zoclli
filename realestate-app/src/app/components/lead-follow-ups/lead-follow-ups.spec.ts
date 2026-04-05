import { createEnvironmentInjector, runInInjectionContext, signal, type EnvironmentInjector } from '@angular/core';
import { LeadFollowUps } from './lead-follow-ups';
import { LeadService } from '../../services/lead.service';
import { TranslationService } from '../../services/translation.service';
import type { Lead } from '../../models/lead.model';

function buildLead(overrides: Partial<Lead>): Lead {
  return {
    id: 'lead-1',
    name: 'Lead',
    phone: '',
    email: '',
    interestedIn: '',
    realtorName: '',
    realtorAgency: '',
    firstInteractionDate: '',
    status: 'new',
    budgetMin: 0,
    budgetMax: 0,
    followUpDate: '',
    notes: [],
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });

  return { promise, resolve };
}

function createLeadFollowUps(
  leads: Lead[],
  updateImpl?: (lead: Lead, service: { leads: ReturnType<typeof signal<Lead[]>> }) => Promise<{ error: string | null }>,
) {
  const leadService = {
    leads: signal(leads),
    update: vi.fn((lead: Lead) => {
      if (updateImpl) {
        return updateImpl(lead, leadService);
      }

      leadService.leads.update(list => list.map(item => item.id === lead.id ? lead : item));
      return Promise.resolve({ error: null });
    }),
  };
  const translationService = new TranslationService();

  const injector = createEnvironmentInjector([
    { provide: TranslationService, useValue: translationService },
    { provide: LeadService, useValue: leadService },
  ]);

  const followUps = runInInjectionContext(injector, () => new LeadFollowUps());

  return { followUps, injector, leadService };
}

describe('LeadFollowUps', () => {
  let injector: EnvironmentInjector | undefined;

  afterEach(() => {
    injector?.destroy();
    injector = undefined;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sorts leads by follow-up date and exposes filter counts for the header chips', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-05T12:00:00.000Z'));

    const { followUps, injector: createdInjector } = createLeadFollowUps([
      buildLead({ id: 'l1', name: 'Bella', followUpDate: '' }),
      buildLead({ id: 'l2', name: 'Chris', followUpDate: '2026-04-07T10:00:00.000Z' }),
      buildLead({ id: 'l3', name: 'Anna', followUpDate: '2026-04-04T16:00:00.000Z' }),
      buildLead({ id: 'l4', name: 'Diana', followUpDate: '2026-04-05T18:00:00.000Z' }),
    ]);
    injector = createdInjector;

    expect(followUps.visibleLeads().map(lead => lead.id)).toEqual(['l3', 'l4', 'l2', 'l1']);
    expect(followUps.filterOptions()).toEqual([
      { value: 'all', label: 'followUps.all', count: 4 },
      { value: 'overdue', label: 'followUps.overdue', count: 1 },
      { value: 'today', label: 'followUps.today', count: 1 },
      { value: 'upcoming', label: 'followUps.upcoming', count: 1 },
    ]);
  });

  it('marks a lead as contacted optimistically and persists the status on success', async () => {
    const updateResult = deferred<{ error: string | null }>();
    const { followUps, injector: createdInjector, leadService } = createLeadFollowUps(
      [buildLead({ id: 'l1', name: 'Anna', status: 'new' })],
      (lead, service) => {
        const promise = updateResult.promise.then(result => {
          if (!result.error) {
            service.leads.update(list => list.map(item => item.id === lead.id ? lead : item));
          }

          return result;
        });

        return promise;
      },
    );
    injector = createdInjector;

    const lead = leadService.leads()[0];
    const savePromise = followUps.markContacted(lead);

    expect(followUps.visibleLeads()[0].status).toBe('contacted');
    expect(followUps.isSaving(lead)).toBe(true);

    updateResult.resolve({ error: null });
    await savePromise;

    expect(leadService.update).toHaveBeenCalledWith({ ...lead, status: 'contacted' });
    expect(leadService.leads()[0].status).toBe('contacted');
    expect(followUps.isSaving(lead)).toBe(false);
    expect(followUps.errorFor(lead)).toBeNull();
  });

  it('reschedules a lead and stores the new follow-up date after a successful save', async () => {
    const { followUps, injector: createdInjector, leadService } = createLeadFollowUps([
      buildLead({ id: 'l1', name: 'Anna', followUpDate: '2026-04-05' }),
    ]);
    injector = createdInjector;

    const lead = leadService.leads()[0];
    followUps.setRescheduleDate(lead.id, '2026-04-09');

    expect(followUps.canReschedule(lead)).toBe(true);

    await followUps.reschedule(lead);

    expect(leadService.update).toHaveBeenCalledWith({ ...lead, followUpDate: '2026-04-09' });
    expect(leadService.leads()[0].followUpDate).toBe('2026-04-09');
    expect(followUps.currentRescheduleDate(leadService.leads()[0])).toBe('2026-04-09');
  });

  it('rolls back optimistic state and shows the error when a quick action fails', async () => {
    const { followUps, injector: createdInjector, leadService } = createLeadFollowUps(
      [buildLead({ id: 'l1', name: 'Anna', status: 'new' })],
      () => Promise.resolve({ error: 'Update failed.' }),
    );
    injector = createdInjector;

    const lead = leadService.leads()[0];
    const savePromise = followUps.markContacted(lead);

    expect(followUps.visibleLeads()[0].status).toBe('contacted');

    await savePromise;

    expect(followUps.visibleLeads()[0].status).toBe('new');
    expect(followUps.errorFor(lead)).toBe('Update failed.');
    expect(followUps.isSaving(lead)).toBe(false);
  });
});
