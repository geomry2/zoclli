import { createEnvironmentInjector, runInInjectionContext, signal, type EnvironmentInjector } from '@angular/core';
import { LeadsBoard } from './leads-board';
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

function createLeadsBoard(
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

  const board = runInInjectionContext(injector, () => new LeadsBoard());

  return { board, injector, leadService };
}

describe('LeadsBoard', () => {
  let injector: EnvironmentInjector | undefined;

  afterEach(() => {
    injector?.destroy();
    injector = undefined;
  });

  it('groups leads by status and sorts cards with upcoming follow-ups first', () => {
    const { board, injector: createdInjector } = createLeadsBoard([
      buildLead({ id: 'l1', name: 'Bella', status: 'new', followUpDate: '' }),
      buildLead({ id: 'l2', name: 'Anna', status: 'new', followUpDate: '2026-04-12' }),
      buildLead({ id: 'l3', name: 'Chris', status: 'contacted', followUpDate: '2026-04-10' }),
      buildLead({ id: 'l4', name: 'Diana', status: 'contacted', followUpDate: '2026-04-08' }),
    ]);
    injector = createdInjector;

    const columns = board.columns();

    expect(columns.find(column => column.status === 'new')?.leads.map(lead => lead.id)).toEqual(['l2', 'l1']);
    expect(columns.find(column => column.status === 'contacted')?.leads.map(lead => lead.id)).toEqual(['l4', 'l3']);
    expect(columns.find(column => column.status === 'negotiating')?.leads).toEqual([]);
    expect(columns.find(column => column.status === 'lost')?.leads).toEqual([]);
  });

  it('moves a lead optimistically and persists the new status on success', async () => {
    const updateResult = deferred<{ error: string | null }>();
    const { board, injector: createdInjector, leadService } = createLeadsBoard(
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
    const movePromise = board.moveLeadToStatus(lead, 'contacted');

    expect(board.columns().find(column => column.status === 'new')?.leads).toEqual([]);
    expect(board.columns().find(column => column.status === 'contacted')?.leads.map(item => item.id)).toEqual(['l1']);
    expect(board.isSaving(lead)).toBe(true);

    updateResult.resolve({ error: null });
    await movePromise;

    expect(leadService.update).toHaveBeenCalledWith({ ...lead, status: 'contacted' });
    expect(leadService.leads()[0].status).toBe('contacted');
    expect(board.isSaving(lead)).toBe(false);
    expect(board.errorFor(lead)).toBeNull();
  });

  it('rolls the card back when the status update fails', async () => {
    const { board, injector: createdInjector, leadService } = createLeadsBoard(
      [buildLead({ id: 'l1', name: 'Anna', status: 'new' })],
      () => Promise.resolve({ error: 'Update failed.' }),
    );
    injector = createdInjector;

    const lead = leadService.leads()[0];
    const movePromise = board.moveLeadToStatus(lead, 'lost');

    expect(board.columns().find(column => column.status === 'lost')?.leads.map(item => item.id)).toEqual(['l1']);

    await movePromise;

    expect(board.columns().find(column => column.status === 'new')?.leads.map(item => item.id)).toEqual(['l1']);
    expect(board.errorFor(lead)).toBe('Update failed.');
    expect(leadService.leads()[0].status).toBe('new');
  });
});
