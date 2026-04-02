import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Lead } from '../models/lead.model';

@Injectable({ providedIn: 'root' })
export class LeadService {
  private readonly http = inject(HttpClient);

  readonly leads = toSignal(
    this.http.get<Lead[]>('/assets/data/leads.json'),
    { initialValue: [] as Lead[] }
  );
}
