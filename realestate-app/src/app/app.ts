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
import { LeadsBoard } from './components/leads-board/leads-board';
import { LeadFollowUps } from './components/lead-follow-ups/lead-follow-ups';
import { Client } from './models/client.model';
import { Lead } from './models/lead.model';
import { Unit } from './models/unit.model';
import { ClientService } from './services/client.service';
import { LeadService } from './services/lead.service';
import { TranslationService } from './services/translation.service';
import { TranslatePipe } from './pipes/translate.pipe';
import { exportToXlsx } from './utils/xlsx.utils';
import { applySearch } from './utils/csv.utils';
import { FollowUpFilter, matchesFollowUpFilter } from './utils/follow-up.utils';

type LeadViewMode = 'board' | 'table' | 'followups';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SearchBar, TabNav, ClientsTable, LeadsTable, LeadsBoard, LeadFollowUps, CreateModal, AddUnitModal, PasswordGate, Dashboard, PropertyCatalogue, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly ts = inject(TranslationService);
  readonly activeTab = signal<TabType>('clients');
  readonly leadsViewMode = signal<LeadViewMode>('board');
  readonly leadFollowUpFilter = signal<FollowUpFilter>('all');
  readonly searchQuery = signal<string>('');
  readonly showModal = signal(false);
  readonly editingClient = signal<Client | null>(null);
  readonly editingLead = signal<Lead | null>(null);
  readonly convertingLead = signal<Lead | null>(null);
  readonly prefillBuilding = signal<string | null>(null);
  readonly showAddUnitModal = signal(false);
  readonly addUnitBuilding = signal<string>('');
  readonly editingUnit = signal<Unit | null>(null);
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

  setLeadsViewMode(mode: LeadViewMode) {
    this.leadsViewMode.set(mode);
  }

  openLeadFollowUps(filter: FollowUpFilter = 'all') {
    this.activeTab.set('leads');
    this.leadsViewMode.set('followups');
    this.leadFollowUpFilter.set(filter);
    this.searchQuery.set('');
  }

  setLeadFollowUpFilter(filter: FollowUpFilter) {
    this.leadFollowUpFilter.set(filter);
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
    this.editingUnit.set(null);
    this.addUnitBuilding.set(buildingName);
    this.showAddUnitModal.set(true);
  }

  openEditUnit(unit: Unit) {
    this.editingUnit.set(unit);
    this.addUnitBuilding.set(unit.buildingName);
    this.showAddUnitModal.set(true);
  }

  closeAddUnitModal() {
    this.showAddUnitModal.set(false);
    this.addUnitBuilding.set('');
    this.editingUnit.set(null);
  }

  exportXlsx() {
    const q = this.searchQuery();
    if (this.activeTab() === 'clients') {
      const rows = applySearch(this.clientService.clients() as unknown as Record<string, unknown>[], q);
      exportToXlsx('clients.xlsx', rows);
    } else {
      let rows = applySearch(this.leadService.leads() as unknown as Record<string, unknown>[], q);
      if (this.leadsViewMode() === 'followups') {
        rows = rows.filter(row =>
          matchesFollowUpFilter(String((row as Record<string, unknown>)['followUpDate'] ?? ''), this.leadFollowUpFilter())
        );
      }
      exportToXlsx('leads.xlsx', rows);
    }
  }
}
