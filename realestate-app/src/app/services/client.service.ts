import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Client } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);

  readonly clients = toSignal(
    this.http.get<Client[]>('assets/data/clients.json'),
    { initialValue: [] as Client[] }
  );
}
