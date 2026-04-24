import { Injectable, inject } from '@angular/core';
import { TranslationService, Lang } from './translation.service';

@Injectable({ providedIn: 'root' })
export class EmailConfirmationService {
  private readonly ts = inject(TranslationService);
  private readonly confirmationBaseUrl = 'https://hook.eu1.make.com/5kf396strzjellotkypcvdaxqi4xl5xr';
  private readonly sendBaseUrl = 'https://hook.eu1.make.com/cfkauqqzhpvfg5y1e7s1byjjciiviw3r';

  buildConfirmationLink(email: string): string {
    return `${this.confirmationBaseUrl}?email=${encodeURIComponent(email.trim())}`;
  }

  buildSubject(lang: Lang): string {
    return this.ts.t('emailConfirm.subject', {}, lang);
  }

  buildMessage(email: string, lang: Lang): string {
    const confirmationLink = this.buildConfirmationLink(email);
    const lines = [
      this.ts.t('emailConfirm.greeting', {}, lang),
      '',
      this.ts.t('emailConfirm.prompt', {}, lang),
      '',
      `${this.ts.t('emailConfirm.cta', {}, lang)}: ${confirmationLink}`,
      '',
      this.ts.t('emailConfirm.signoff', {}, lang),
      '',
      this.ts.t('emailConfirm.signature', {}, lang),
    ];
    return lines.join('\n');
  }

  buildHtmlMessage(email: string, lang: Lang): string {
    const confirmationLink = this.buildConfirmationLink(email);
    return [
      `<p>${this.ts.t('emailConfirm.greeting', {}, lang)}</p>`,
      `<p>${this.ts.t('emailConfirm.prompt', {}, lang)}</p>`,
      `<p><a href="${confirmationLink}"><strong>${this.ts.t('emailConfirm.cta', {}, lang)}</strong></a></p>`,
      `<p>${this.ts.t('emailConfirm.signoff', {}, lang)}</p>`,
      `<p>${this.ts.t('emailConfirm.signature', {}, lang)}</p>`,
    ].join('');
  }

  canSendEmail(): boolean {
    return true;
  }

  buildSendEmailLink(email: string): string {
    return `${this.sendBaseUrl}?email=${encodeURIComponent(email.trim())}`;
  }

  async sendConfirmationEmail(email: string, _lang: Lang): Promise<{ error: string | null }> {
    try {
      window.open(this.buildSendEmailLink(email), '_blank', 'noopener');
      return { error: null };
    } catch {
      return { error: this.ts.t('emailConfirm.sendFailed') };
    }
  }
}
