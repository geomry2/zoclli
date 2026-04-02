import { Component, signal } from '@angular/core';
import { SearchBar } from './components/search-bar/search-bar';
import { TabNav, TabType } from './components/tab-nav/tab-nav';
import { ClientsTable } from './components/clients-table/clients-table';
import { LeadsTable } from './components/leads-table/leads-table';
import { CreateModal } from './components/create-modal/create-modal';
import { PasswordGate } from './components/password-gate/password-gate';
import { Client } from './models/client.model';
import { Lead } from './models/lead.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SearchBar, TabNav, ClientsTable, LeadsTable, CreateModal, PasswordGate],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly activeTab = signal<TabType>('clients');
  readonly searchQuery = signal<string>('');
  readonly showModal = signal(false);
  readonly editingClient = signal<Client | null>(null);
  readonly editingLead = signal<Lead | null>(null);

  switchTab(tab: TabType) {
    this.activeTab.set(tab);
    this.searchQuery.set('');
  }

  onQueryChange(query: string) { this.searchQuery.set(query); }

  openCreate() {
    this.editingClient.set(null);
    this.editingLead.set(null);
    this.showModal.set(true);
  }

  openEditClient(client: Client) {
    this.editingClient.set(client);
    this.editingLead.set(null);
    this.showModal.set(true);
  }

  openEditLead(lead: Lead) {
    this.editingLead.set(lead);
    this.editingClient.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingClient.set(null);
    this.editingLead.set(null);
  }
}
