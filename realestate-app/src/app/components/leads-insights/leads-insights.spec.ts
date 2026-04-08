import { createEnvironmentInjector, runInInjectionContext, signal, type EnvironmentInjector } from '@angular/core';
import { LeadService } from '../../services/lead.service';
import { TranslationService } from '../../services/translation.service';
import type { Lead } from '../../models/lead.model';
import { LeadsInsights } from './leads-insights';

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

function createLeadsInsights(leads: Lead[]) {
  const leadService = { leads: signal(leads) };
  const translationService = new TranslationService();
  translationService.setLang('en');

  const injector = createEnvironmentInjector([
    { provide: TranslationService, useValue: translationService },
    { provide: LeadService, useValue: leadService },
  ]);

  const insights = runInInjectionContext(injector, () => new LeadsInsights());

  return { insights, injector, leadService };
}

describe('LeadsInsights', () => {
  let injector: EnvironmentInjector | undefined;

  afterEach(() => {
    injector?.destroy();
    injector = undefined;
    vi.useRealTimers();
  });

  it('aggregates expected budgets and project demand from lead ranges', () => {
    const { insights, injector: createdInjector } = createLeadsInsights([
      buildLead({ id: 'l1', interestedIn: 'Azure Bay', budgetMin: 100_000, budgetMax: 300_000 }),
      buildLead({ id: 'l2', interestedIn: 'Azure Bay', budgetMin: 200_000, budgetMax: 400_000 }),
      buildLead({ id: 'l3', interestedIn: '', budgetMin: 100_000, budgetMax: 100_000 }),
    ]);
    injector = createdInjector;

    expect(insights.totalPotentialBudget()).toBe(600_000);
    expect(insights.averageExpectedBudget()).toBe(200_000);
    expect(insights.trackedProjects()).toBe(1);
    expect(insights.projectDemand()).toEqual([
      { name: 'Azure Bay', count: 2, amount: 500_000, avgBudget: 250_000, pct: 67 },
      { name: 'Not specified', count: 1, amount: 100_000, avgBudget: 100_000, pct: 33 },
    ]);
  });

  it('builds pipeline and monthly flow summaries from reactive lead state', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T09:00:00.000Z'));

    const { insights, injector: createdInjector } = createLeadsInsights([
      buildLead({ id: 'l1', status: 'new', budgetMin: 100_000, budgetMax: 200_000, firstInteractionDate: '2026-04-01' }),
      buildLead({ id: 'l2', status: 'contacted', budgetMin: 120_000, budgetMax: 180_000, firstInteractionDate: '2026-04-03' }),
      buildLead({ id: 'l3', status: 'lost', budgetMin: 300_000, budgetMax: 300_000, firstInteractionDate: '2026-02-10' }),
    ]);
    injector = createdInjector;

    expect(insights.statusRows()).toEqual([
      { status: 'new', count: 1, amount: 150_000, pct: 33, color: '#3B82F6' },
      { status: 'contacted', count: 1, amount: 150_000, pct: 33, color: '#F59E0B' },
      { status: 'negotiating', count: 0, amount: 0, pct: 0, color: '#8B5CF6' },
      { status: 'lost', count: 1, amount: 300_000, pct: 33, color: '#EF4444' },
    ]);

    const monthlyFlow = insights.monthlyFlow();
    expect(monthlyFlow.map(month => month.label)).toEqual(['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']);
    expect(monthlyFlow.map(month => month.count)).toEqual([0, 0, 0, 1, 0, 2]);
    expect(monthlyFlow.map(month => month.amount)).toEqual([0, 0, 0, 300_000, 0, 300_000]);
  });
});
