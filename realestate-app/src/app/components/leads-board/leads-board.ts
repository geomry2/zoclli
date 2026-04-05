import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Lead, LeadStatus } from '../../models/lead.model';
import { LeadService } from '../../services/lead.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { applySearch } from '../../utils/csv.utils';

interface LeadBoardColumn {
  status: LeadStatus;
  leads: Lead[];
}

@Component({
  selector: 'app-leads-board',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './leads-board.html',
  styleUrl: './leads-board.scss'
})
export class LeadsBoard {
  readonly searchQuery = input<string>('');
  readonly editRequest = output<Lead>();
  readonly convertRequest = output<Lead>();

  readonly ts = inject(TranslationService);
  private readonly leadService = inject(LeadService);

  readonly statuses: LeadStatus[] = ['new', 'contacted', 'negotiating', 'lost'];
  readonly draggedLeadId = signal<string | null>(null);
  readonly dropTargetStatus = signal<LeadStatus | null>(null);
  readonly movingLeadId = signal<string | null>(null);
  readonly pendingStatuses = signal<Record<string, LeadStatus>>({});
  readonly moveError = signal<string | null>(null);
  readonly moveErrorLeadId = signal<string | null>(null);

  readonly visibleLeads = computed(() => {
    const filtered = applySearch(
      this.leadService.leads() as unknown as Record<string, unknown>[],
      this.searchQuery(),
    ) as unknown as Lead[];

    const pendingStatuses = this.pendingStatuses();
    return filtered.map(lead => (
      pendingStatuses[lead.id]
        ? { ...lead, status: pendingStatuses[lead.id] }
        : lead
    ));
  });

  readonly columns = computed((): LeadBoardColumn[] =>
    this.statuses.map(status => ({
      status,
      leads: this.visibleLeads()
        .filter(lead => lead.status === status)
        .sort((left, right) => this.compareLeadCards(left, right)),
    }))
  );

  readonly showResultCount = computed(() => Boolean(this.searchQuery().trim()));

  requestEdit(event: Event, lead: Lead) {
    event.stopPropagation();
    this.editRequest.emit(lead);
  }

  requestConvert(event: Event, lead: Lead) {
    event.stopPropagation();
    this.convertRequest.emit(lead);
  }

  onDragStart(event: DragEvent, lead: Lead) {
    if (this.movingLeadId() === lead.id) return;

    this.draggedLeadId.set(lead.id);
    this.moveError.set(null);
    this.moveErrorLeadId.set(null);

    event.dataTransfer?.setData('text/plain', lead.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragEnd() {
    this.draggedLeadId.set(null);
    this.dropTargetStatus.set(null);
  }

  onDragOver(event: DragEvent, status: LeadStatus) {
    if (!this.findDraggedLead()) return;

    event.preventDefault();
    this.dropTargetStatus.set(status);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragLeave(event: DragEvent, status: LeadStatus) {
    if (this.dropTargetStatus() !== status) return;

    const currentTarget = event.currentTarget;
    if (!(currentTarget instanceof HTMLElement)) {
      this.dropTargetStatus.set(null);
      return;
    }

    const { clientX, clientY } = event;
    const bounds = currentTarget.getBoundingClientRect();
    const isStillInside =
      clientX >= bounds.left &&
      clientX <= bounds.right &&
      clientY >= bounds.top &&
      clientY <= bounds.bottom;

    if (!isStillInside) {
      this.dropTargetStatus.set(null);
    }
  }

  async onDrop(event: DragEvent, status: LeadStatus) {
    event.preventDefault();

    const draggedLeadId = event.dataTransfer?.getData('text/plain') || undefined;
    const lead = this.findDraggedLead(draggedLeadId);
    this.dropTargetStatus.set(null);
    if (!lead) {
      this.draggedLeadId.set(null);
      return;
    }

    await this.moveLeadToStatus(lead, status);
  }

  async moveLeadToStatus(lead: Lead, status: LeadStatus) {
    if (lead.status === status) {
      this.draggedLeadId.set(null);
      return;
    }

    this.pendingStatuses.update(state => ({ ...state, [lead.id]: status }));
    this.movingLeadId.set(lead.id);
    this.moveError.set(null);
    this.moveErrorLeadId.set(null);

    const { error } = await this.leadService.update({ ...lead, status });

    this.pendingStatuses.update(state => {
      const next = { ...state };
      delete next[lead.id];
      return next;
    });
    this.movingLeadId.set(null);
    this.draggedLeadId.set(null);
    this.dropTargetStatus.set(null);

    if (error) {
      this.moveError.set(error);
      this.moveErrorLeadId.set(lead.id);
      return;
    }

    this.moveError.set(null);
    this.moveErrorLeadId.set(null);
  }

  formatBudget(lead: Lead): string {
    return '€' + lead.budgetMin.toLocaleString('en-US') + ' - €' + lead.budgetMax.toLocaleString('en-US');
  }

  formatFollowUp(date: string): string {
    if (!date) return this.ts.t('leadBoard.noFollowUp');
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  isOverdue(date: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date(new Date().toDateString());
  }

  isDueToday(date: string): boolean {
    if (!date) return false;
    return new Date(date).toDateString() === new Date().toDateString();
  }

  isDropTarget(status: LeadStatus): boolean {
    return this.dropTargetStatus() === status;
  }

  isDragging(lead: Lead): boolean {
    return this.draggedLeadId() === lead.id;
  }

  isSaving(lead: Lead): boolean {
    return this.movingLeadId() === lead.id;
  }

  errorFor(lead: Lead): string | null {
    return this.moveErrorLeadId() === lead.id ? this.moveError() : null;
  }

  private findDraggedLead(fallbackId?: string): Lead | undefined {
    const draggedLeadId = this.draggedLeadId() ?? fallbackId;
    if (!draggedLeadId) return undefined;

    return this.leadService.leads().find(lead => lead.id === draggedLeadId);
  }

  private compareLeadCards(left: Lead, right: Lead): number {
    const leftDate = this.parseDate(left.followUpDate);
    const rightDate = this.parseDate(right.followUpDate);

    if (leftDate && rightDate && leftDate !== rightDate) {
      return leftDate - rightDate;
    }
    if (leftDate && !rightDate) return -1;
    if (!leftDate && rightDate) return 1;

    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  }

  private parseDate(value: string): number | null {
    if (!value) return null;

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
}
