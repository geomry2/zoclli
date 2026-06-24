import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
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
import { LeadsInsights } from './components/leads-insights/leads-insights';
import { TaskBoard } from './components/task-board/task-board';
import { MaintenanceBoard } from './components/maintenance-board/maintenance-board';
import { TaskImportModal } from './components/task-import-modal/task-import-modal';
import { TaskModal } from './components/task-modal/task-modal';
import { Workflow } from './components/workflow/workflow';
import { EmailTemplates } from './components/email-templates/email-templates';
import { Client } from './models/client.model';
import { Lead } from './models/lead.model';
import { Task, TaskBoardType } from './models/task.model';
import { Unit } from './models/unit.model';
import { ClientService } from './services/client.service';
import { LeadService } from './services/lead.service';
import { AuthService } from './services/auth.service';
import { TranslationService } from './services/translation.service';
import { TranslatePipe } from './pipes/translate.pipe';
import { exportToXlsx } from './utils/xlsx.utils';
import { applySearch } from './utils/csv.utils';
import { FollowUpFilter, matchesFollowUpFilter } from './utils/follow-up.utils';
import { parseAppUrl, routeForLeadView, routeForTab, type LeadViewMode } from './app.routes';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SearchBar, TabNav, ClientsTable, LeadsTable, LeadsBoard, LeadFollowUps, LeadsInsights, TaskBoard, MaintenanceBoard, TaskImportModal, TaskModal, CreateModal, AddUnitModal, PasswordGate, Dashboard, PropertyCatalogue, Workflow, EmailTemplates, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly ts = inject(TranslationService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  private readonly routeState = computed(() => parseAppUrl(this.currentUrl()));
  readonly activeTab = computed<TabType>(() => this.routeState().tab);
  readonly sidebarCollapsed = signal(true);
  readonly sidebarPreviewExpanded = signal(false);
  readonly mobileSidebarOpen = signal(false);
  readonly taskRelationPrefill = signal<{ type: 'lead' | 'client' | 'property' | 'deal'; id: string; sourceLabel?: string } | null>(null);
  readonly editingTask = signal<Task | null>(null);
  readonly taskModalBoard = signal<TaskBoardType>('operations');
  readonly focusedTaskId = signal<string | null>(null);
  readonly showTaskModal = signal(false);
  readonly showTaskImportModal = signal(false);
  readonly leadsViewMode = computed<LeadViewMode>(() => this.routeState().leadsViewMode);
  readonly leadFollowUpFilter = computed<FollowUpFilter>(() => this.routeState().leadFollowUpFilter);
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
    this.convertingLead() || this.editingClient()
      ? 'clients'
      : (this.editingLead() || this.activeTab() === 'leads' ? 'leads' : 'clients')
  );

  readonly activeTabLabel = computed(() => {
    const labels: Record<TabType, string> = {
      dashboard: 'nav.dashboard',
      clients: 'nav.clients',
      leads: 'nav.leads',
      properties: 'nav.properties',
      tasks: 'nav.tasks',
      maintenance: 'nav.maintenance',
      workflow: 'nav.workflow',
      emails: 'nav.emails',
    };
    return labels[this.activeTab()];
  });
  readonly currentUserName = computed(() => this.auth.nameForLanguage(this.ts.lang()));
  readonly currentUserInitial = computed(() => this.currentUserName().charAt(0).toUpperCase());
  readonly dashboardGreeting = computed(() =>
    this.ts.t('app.greeting', { name: this.currentUserName() || this.ts.t('app.teammate') })
  );

  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);

  switchTab(tab: TabType) {
    this.searchQuery.set('');
    this.mobileSidebarOpen.set(false);
    void this.router.navigateByUrl(routeForTab(tab));
  }

  toggleMobileSidebar() {
    this.mobileSidebarOpen.update(open => !open);
  }

  closeMobileSidebar() {
    this.mobileSidebarOpen.set(false);
  }

  onSidebarCollapsedChange(collapsed: boolean) {
    this.sidebarCollapsed.set(collapsed);
    if (!collapsed) {
      this.sidebarPreviewExpanded.set(false);
    }
  }

  onSidebarPreviewExpandedChange(expanded: boolean) {
    if (!this.sidebarCollapsed()) {
      this.sidebarPreviewExpanded.set(false);
      return;
    }

    this.sidebarPreviewExpanded.set(expanded);
  }

  setLeadsViewMode(mode: LeadViewMode) {
    this.closeMobileSidebar();
    void this.router.navigateByUrl(routeForLeadView(mode));
  }

  openLeadFollowUps(filter: FollowUpFilter = 'all') {
    this.searchQuery.set('');
    this.closeMobileSidebar();
    void this.router.navigateByUrl(routeForLeadView('followups', filter));
  }

  setLeadFollowUpFilter(filter: FollowUpFilter) {
    this.closeMobileSidebar();
    void this.router.navigateByUrl(routeForLeadView('followups', filter));
  }

  onQueryChange(query: string) { this.searchQuery.set(query); }

  openCreate() {
    this.closeMobileSidebar();
    this.editingClient.set(null);
    this.editingLead.set(null);
    this.showModal.set(true);
  }

  openEditClient(client: Client) {
    this.closeMobileSidebar();
    this.editingClient.set(client);
    this.editingLead.set(null);
    this.showModal.set(true);
  }

  openEditLead(lead: Lead) {
    this.closeMobileSidebar();
    this.editingLead.set(lead);
    this.editingClient.set(null);
    this.convertingLead.set(null);
    this.showModal.set(true);
  }

  openConvertLead(lead: Lead) {
    this.closeMobileSidebar();
    void this.router.navigateByUrl(routeForTab('clients'));
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

  openCreateTask(prefill?: { type: 'lead' | 'client' | 'property' | 'deal'; id: string; sourceLabel?: string }, board: TaskBoardType = 'operations') {
    this.closeMobileSidebar();
    void this.router.navigateByUrl(routeForTab(board === 'maintenance' ? 'maintenance' : 'tasks'));
    this.taskModalBoard.set(board);
    this.taskRelationPrefill.set(prefill ?? null);
    this.editingTask.set(null);
    this.showTaskModal.set(true);
  }

  openTaskImport() {
    this.searchQuery.set('');
    this.closeMobileSidebar();
    void this.router.navigateByUrl(routeForTab('tasks'));
    this.showTaskImportModal.set(true);
  }

  closeTaskImportModal() {
    this.showTaskImportModal.set(false);
  }

  clearTaskPrefill() {
    this.taskRelationPrefill.set(null);
  }

  openEditTask(task: Task) {
    this.closeMobileSidebar();
    void this.router.navigateByUrl(routeForTab(task.board === 'maintenance' ? 'maintenance' : 'tasks'));
    this.taskModalBoard.set(task.board);
    this.taskRelationPrefill.set(null);
    this.editingTask.set(task);
    this.showTaskModal.set(true);
  }

  focusTaskFromDashboard(task: Task) {
    this.searchQuery.set('');
    this.closeMobileSidebar();
    this.focusedTaskId.set(null);
    void this.router.navigateByUrl(routeForTab(task.board === 'maintenance' ? 'maintenance' : 'tasks')).then(() => {
      queueMicrotask(() => this.focusedTaskId.set(task.id));
      window.setTimeout(() => {
        if (this.focusedTaskId() === task.id) this.focusedTaskId.set(null);
      }, 2500);
    });
  }

  closeTaskModal() {
    this.showTaskModal.set(false);
    this.editingTask.set(null);
    this.clearTaskPrefill();
  }

  openAddUnit(buildingName: string) {
    this.closeMobileSidebar();
    this.editingUnit.set(null);
    this.addUnitBuilding.set(buildingName);
    this.showAddUnitModal.set(true);
  }

  openEditUnit(unit: Unit) {
    this.closeMobileSidebar();
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
    } else if (this.activeTab() === 'leads') {
      let rows = applySearch(this.leadService.leads() as unknown as Record<string, unknown>[], q);
      if (this.leadsViewMode() === 'followups') {
        rows = rows.filter(row =>
          matchesFollowUpFilter(String((row as Record<string, unknown>)['followUpDate'] ?? ''), this.leadFollowUpFilter())
        );
      }
      exportToXlsx('leads.xlsx', rows);
    }
  }

  signOut() {
    void this.auth.signOut();
  }
}
