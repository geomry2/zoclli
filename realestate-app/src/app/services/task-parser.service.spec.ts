import { createEnvironmentInjector, runInInjectionContext, type EnvironmentInjector } from '@angular/core';
import { TaskParserService } from './task-parser.service';
import { ClientService } from './client.service';
import { LeadService } from './lead.service';

function createTaskParser() {
  const clientService = { clients: () => [] };
  const leadService = { leads: () => [] };

  const injector = createEnvironmentInjector([
    { provide: ClientService, useValue: clientService },
    { provide: LeadService, useValue: leadService },
  ]);

  const service = runInInjectionContext(injector, () => new TaskParserService());
  return { service, injector };
}

describe('TaskParserService', () => {
  let injector: EnvironmentInjector | undefined;

  afterEach(() => {
    injector?.destroy();
    injector = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('parses russian weekday references into the next matching date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T10:00:00.000Z'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const created = createTaskParser();
    injector = created.injector;

    const draft = await created.service.parse({
      text: 'По понедельнику нужно отправить документы',
      source: 'voice',
    });

    expect(draft.dueAt).toBe('2026-04-13');
  });

  it('treats weekday mentions on the same weekday as the following week', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T09:00:00.000Z'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const created = createTaskParser();
    injector = created.injector;

    const draft = await created.service.parse({
      text: 'Call client on monday about contract',
      source: 'voice',
    });

    expect(draft.dueAt).toBe('2026-04-13');
  });

  it('keeps heuristic due date when remote parsing returns no date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T10:00:00.000Z'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Send docs',
        dueAt: '',
      }),
    }));

    const created = createTaskParser();
    injector = created.injector;

    const draft = await created.service.parse({
      text: 'По понедельнику отправить документы',
      source: 'voice',
    });

    expect(draft.title).toBe('Send docs');
    expect(draft.dueAt).toBe('2026-04-13');
  });

  it('parses day-after-tomorrow and time-of-day phrases', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T10:00:00.000Z'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const created = createTaskParser();
    injector = created.injector;

    const draft = await created.service.parse({
      text: 'Послезавтра вечером позвонить клиенту',
      source: 'voice',
    });

    expect(draft.dueAt).toBe('2026-04-10T18:00');
  });

  it('parses next-week weekday references', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T10:00:00.000Z'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const created = createTaskParser();
    injector = created.injector;

    const draft = await created.service.parse({
      text: 'На следующей неделе во вторник обновить прайсы',
      source: 'voice',
    });

    expect(draft.dueAt).toBe('2026-04-14');
  });

  it('parses end-of-week and weekday morning phrases', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T10:00:00.000Z'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const created = createTaskParser();
    injector = created.injector;

    const fridayMorning = await created.service.parse({
      text: 'В пятницу утром отправить договор',
      source: 'voice',
    });
    const endOfWeek = await created.service.parse({
      text: 'К концу недели закрыть документы',
      source: 'voice',
    });

    expect(fridayMorning.dueAt).toBe('2026-04-10T09:00');
    expect(endOfWeek.dueAt).toBe('2026-04-10T18:00');
  });
});
