import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { EmailConfirmationService } from '../../services/email-confirmation.service';
import { TranslationService } from '../../services/translation.service';
import { EmailConfirmationStatus } from '../../models/email-confirmation.model';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
import { Client } from '../../models/client.model';
import { Lead } from '../../models/lead.model';

@Component({
  selector: 'app-email-confirmation-control',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './email-confirmation-control.html',
  styleUrl: './email-confirmation-control.scss',
})
export class EmailConfirmationControl {
  readonly email = input<string>('');
  readonly status = input<EmailConfirmationStatus>('not_sent');
  readonly compact = input(false);
  readonly entityType = input<'client' | 'lead' | null>(null);
  readonly entityId = input<string>('');
  readonly statusChange = output<EmailConfirmationStatus>();

  private readonly emailConfirmation = inject(EmailConfirmationService);
  private readonly ts = inject(TranslationService);
  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);

  readonly showModal = signal(false);
  readonly copyFeedback = signal<'idle' | 'done' | 'error'>('idle');
  readonly sendState = signal<'idle' | 'sending' | 'sent'>('idle');
  readonly updatingStatus = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly normalizedEmail = computed(() => this.email().trim());
  readonly hasEmail = computed(() => Boolean(this.normalizedEmail()));
  readonly currentStatus = signal<EmailConfirmationStatus>('not_sent');
  readonly confirmationLink = computed(() =>
    this.hasEmail() ? this.emailConfirmation.buildConfirmationLink(this.normalizedEmail()) : ''
  );
  readonly confirmationMessage = computed(() =>
    this.hasEmail()
      ? this.emailConfirmation.buildMessage(this.normalizedEmail(), this.ts.lang())
      : ''
  );
  readonly sendConfigured = computed(() => this.emailConfirmation.canSendEmail());
  readonly visibleStatus = computed(() => this.showModal() ? this.currentStatus() : this.status());
  readonly canSend = computed(() =>
    this.hasEmail() && this.sendConfigured() && this.sendState() !== 'sending'
  );
  readonly nextResolveStatus = computed<EmailConfirmationStatus>(() =>
    this.visibleStatus() === 'resolved' ? 'pending' : 'resolved'
  );
  readonly resolveActionLabel = computed(() =>
    this.visibleStatus() === 'resolved'
      ? this.ts.t('emailConfirm.unmarkResolved')
      : this.ts.t('emailConfirm.markResolved')
  );
  readonly statusLabel = computed(() => {
    switch (this.visibleStatus()) {
      case 'resolved':
        return this.ts.t('emailConfirm.statusResolved');
      case 'pending':
        return this.ts.t('emailConfirm.statusPending');
      default:
        return this.ts.t('emailConfirm.statusNotSent');
    }
  });
  readonly statusGlyph = computed(() => this.visibleStatus() === 'resolved' ? '✓' : '●');

  openModal(event?: Event) {
    event?.stopPropagation();
    if (!this.hasEmail()) return;
    this.currentStatus.set(this.status());
    this.errorMessage.set(null);
    this.copyFeedback.set('idle');
    this.sendState.set('idle');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.errorMessage.set(null);
    this.copyFeedback.set('idle');
    this.sendState.set('idle');
  }

  async copyMessage() {
    if (!this.hasEmail()) return;

    try {
      await navigator.clipboard.writeText(this.confirmationMessage());
      await this.persistStatus('pending');
      this.copyFeedback.set('done');
      this.errorMessage.set(null);
    } catch {
      this.copyFeedback.set('error');
      this.errorMessage.set(this.ts.t('emailConfirm.copyFailed'));
    }
  }

  async sendMessage() {
    if (!this.hasEmail() || !this.sendConfigured()) {
      this.errorMessage.set(this.ts.t('emailConfirm.sendNotConfigured'));
      return;
    }

    this.sendState.set('sending');
    this.errorMessage.set(null);
    const { error } = await this.emailConfirmation.sendConfirmationEmail(this.normalizedEmail(), this.ts.lang());
    if (error) {
      this.sendState.set('idle');
      this.errorMessage.set(error);
      return;
    }

    await this.persistStatus('pending');
    this.sendState.set('sent');
  }

  async toggleResolved() {
    await this.persistStatus(this.nextResolveStatus());
  }

  private async persistStatus(status: EmailConfirmationStatus) {
    this.currentStatus.set(status);
    this.statusChange.emit(status);

    const entityType = this.entityType();
    const entityId = this.entityId().trim();
    if (!entityType || !entityId) {
      return;
    }

    this.updatingStatus.set(true);
    const result = entityType === 'client'
      ? await this.persistClientStatus(entityId, status)
      : await this.persistLeadStatus(entityId, status);
    this.updatingStatus.set(false);

    if (result.error) {
      this.errorMessage.set(result.error);
      this.currentStatus.set(this.status());
      this.statusChange.emit(this.status());
    }
  }

  private async persistClientStatus(id: string, status: EmailConfirmationStatus): Promise<{ error: string | null }> {
    const client = this.clientService.clients().find(item => item.id === id);
    if (!client) {
      return { error: this.ts.t('emailConfirm.recordMissing') };
    }

    const nextClient: Client = {
      ...client,
      emailConfirmationStatus: status,
    };
    return this.clientService.update(nextClient);
  }

  private async persistLeadStatus(id: string, status: EmailConfirmationStatus): Promise<{ error: string | null }> {
    const lead = this.leadService.leads().find(item => item.id === id);
    if (!lead) {
      return { error: this.ts.t('emailConfirm.recordMissing') };
    }

    const nextLead: Lead = {
      ...lead,
      emailConfirmationStatus: status,
    };
    return this.leadService.update(nextLead);
  }
}
