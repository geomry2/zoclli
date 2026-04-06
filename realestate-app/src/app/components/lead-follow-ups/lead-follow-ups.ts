import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Lead, LeadStatus } from '../../models/lead.model';
import { LeadService } from '../../services/lead.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { applySearch } from '../../utils/csv.utils';
import {
  countByFollowUpFilter,
  FollowUpFilter,
  getFollowUpState,
  matchesFollowUpFilter,
  sortByFollowUpDate,
} from '../../utils/follow-up.utils';

type LeadPatch = Partial<Pick<Lead, 'status' | 'followUpDate'>>;

interface FollowUpFilterOption {
  value: FollowUpFilter;
  label: string;
  count: number;
}

@Component({
  selector: 'app-lead-follow-ups',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './lead-follow-ups.html',
  styleUrl: './lead-follow-ups.scss'
})
export class LeadFollowUps {
  readonly searchQuery = input<string>('');
  readonly filterMode = input<FollowUpFilter>('all');
  readonly filterModeChange = output<FollowUpFilter>();

  readonly ts = inject(TranslationService);
  private readonly leadService = inject(LeadService);

  readonly savingLeadId = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionErrorLeadId = signal<string | null>(null);
  readonly pendingPatches = signal<Record<string, LeadPatch>>({});
  readonly rescheduleDrafts = signal<Record<string, string>>({});

  readonly searchedLeads = computed(() =>
    applySearch(
      this.leadService.leads() as unknown as Record<string, unknown>[],
      this.searchQuery(),
    ) as unknown as Lead[]
  );

  readonly filterOptions = computed((): FollowUpFilterOption[] => {
    const leads = this.searchedLeads();
    return [
      { value: 'all', label: 'followUps.all', count: leads.length },
      { value: 'overdue', label: 'followUps.overdue', count: countByFollowUpFilter(leads, 'overdue') },
      { value: 'today', label: 'followUps.today', count: countByFollowUpFilter(leads, 'today') },
      { value: 'upcoming', label: 'followUps.upcoming', count: countByFollowUpFilter(leads, 'upcoming') },
    ];
  });

  readonly visibleLeads = computed(() => {
    const patchedLeads = this.searchedLeads().map(lead => this.withPendingPatch(lead));
    return patchedLeads
      .filter(lead => matchesFollowUpFilter(lead.followUpDate, this.filterMode()))
      .sort((left, right) => sortByFollowUpDate(left, right));
  });

  selectFilter(filter: FollowUpFilter) {
    this.filterModeChange.emit(filter);
  }

  currentRescheduleDate(lead: Lead): string {
    return this.rescheduleDrafts()[lead.id] ?? '';
  }

  setRescheduleDate(leadId: string, value: string) {
    this.rescheduleDrafts.update(state => ({ ...state, [leadId]: value }));
  }

  async markContacted(lead: Lead) {
    if (lead.status === 'contacted') return;
    await this.saveLeadPatch(lead, { status: 'contacted' });
  }

  async reschedule(lead: Lead) {
    const nextDate = this.currentRescheduleDate(lead);
    if (!nextDate) return;
    await this.saveLeadPatch(lead, { followUpDate: nextDate });
  }

  isSaving(lead: Lead): boolean {
    return this.savingLeadId() === lead.id;
  }

  canMarkContacted(lead: Lead): boolean {
    return lead.status !== 'contacted' && !this.isSaving(lead);
  }

  canReschedule(lead: Lead): boolean {
    const nextDate = this.currentRescheduleDate(lead);
    return Boolean(nextDate) && !this.isSaving(lead);
  }

  followUpState(lead: Lead): ReturnType<typeof getFollowUpState> {
    return getFollowUpState(lead.followUpDate);
  }

  formatFollowUpDate(value: string): string {
    if (!value) return this.ts.t('followUps.noDate');
    return new Date(value).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  errorFor(lead: Lead): string | null {
    return this.actionErrorLeadId() === lead.id ? this.actionError() : null;
  }

  private withPendingPatch(lead: Lead): Lead {
    const patch = this.pendingPatches()[lead.id];
    return patch ? { ...lead, ...patch } : lead;
  }

  private async saveLeadPatch(lead: Lead, patch: LeadPatch) {
    const baseLead = this.leadService.leads().find(item => item.id === lead.id) ?? lead;

    this.pendingPatches.update(state => ({ ...state, [lead.id]: { ...(state[lead.id] ?? {}), ...patch } }));
    this.savingLeadId.set(lead.id);
    this.actionError.set(null);
    this.actionErrorLeadId.set(null);

    const { error } = await this.leadService.update({ ...baseLead, ...patch });

    this.pendingPatches.update(state => {
      const next = { ...state };
      delete next[lead.id];
      return next;
    });
    this.savingLeadId.set(null);

    if (error) {
      this.actionError.set(error);
      this.actionErrorLeadId.set(lead.id);
      return;
    }

    if (patch.followUpDate) {
      this.rescheduleDrafts.update(state => {
        const next = { ...state, [lead.id]: patch.followUpDate! };
        return next;
      });
    }

    this.actionError.set(null);
    this.actionErrorLeadId.set(null);
  }
}
