import { Component, computed, inject, signal } from '@angular/core';
import { SearchBar } from './components/search-bar/search-bar';
import { TabNav, TabType } from './components/tab-nav/tab-nav';
import { ClientsTable } from './components/clients-table/clients-table';
import { LeadsTable } from './components/leads-table/leads-table';
import { CreateModal } from './components/create-modal/create-modal';
import { PasswordGate } from './components/password-gate/password-gate';
import { Dashboard } from './components/dashboard/dashboard';
import { PropertyCatalogue } from './components/property-catalogue/property-catalogue';
import { AddUnitModal } from './components/add-unit-modal/add-unit-modal';
import { Client } from './models/client.model';
import { Lead } from './models/lead.model';
import { ClientService } from './services/client.service';
import { LeadService } from './services/lead.service';
import { exportToXlsx } from './utils/xlsx.utils';
import { applySearch } from './utils/csv.utils';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SearchBar, TabNav, ClientsTable, LeadsTable, CreateModal, AddUnitModal, PasswordGate, Dashboard, PropertyCatalogue],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly activeTab = signal<TabType>('clients');
  readonly searchQuery = signal<string>('');
  readonly showModal = signal(false);
  readonly editingClient = signal<Client | null>(null);
  readonly editingLead = signal<Lead | null>(null);
  readonly convertingLead = signal<Lead | null>(null);
  readonly prefillBuilding = signal<string | null>(null);
  readonly showAddUnitModal = signal(false);
  readonly addUnitBuilding = signal<string>('');
  /** Narrows activeTab to only the values CreateModal accepts */
  readonly modalTab = computed<'clients' | 'leads'>(() =>
    this.activeTab() === 'leads' ? 'leads' : 'clients'
  );

  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);

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
    this.convertingLead.set(null);
    this.showModal.set(true);
  }

  openConvertLead(lead: Lead) {
    this.activeTab.set('clients');
    this.convertingLead.set(lead);
    this.editingClient.set(null);
    this.editingLead.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingClient.set(null);
    this.editingLead.set(null);
    this.convertingLead.set(null);
    this.prefillBuilding.set(null);
  }

  openAddUnit(buildingName: string) {
    this.addUnitBuilding.set(buildingName);
    this.showAddUnitModal.set(true);
  }

  closeAddUnitModal() {
    this.showAddUnitModal.set(false);
    this.addUnitBuilding.set('');
  }

  exportXlsx() {
    const q = this.searchQuery();
    if (this.activeTab() === 'clients') {
      const rows = applySearch(this.clientService.clients() as unknown as Record<string, unknown>[], q);
      exportToXlsx('clients.xlsx', rows);
    } else {
      const rows = applySearch(this.leadService.leads() as unknown as Record<string, unknown>[], q);
      exportToXlsx('leads.xlsx', rows);
    }
  }
}
