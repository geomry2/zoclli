import { Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type TabType = 'clients' | 'leads' | 'dashboard' | 'properties' | 'tasks' | 'maintenance' | 'workflow' | 'emails';

interface SidebarItem {
  id: TabType;
  labelKey: string;
  icon: string;
  group: string;
}

interface SidebarLink {
  labelKey: string;
  href: string;
  icon: string;
}

@Component({
  selector: 'app-tab-nav',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './tab-nav.html',
  styleUrl: './tab-nav.scss'
})
export class TabNav {
  readonly activeTab = input<TabType>('clients');
  readonly collapsed = input(true);
  readonly mobileOpen = input(false);
  readonly tabChange = output<TabType>();
  readonly collapsedChange = output<boolean>();
  readonly previewExpandedChange = output<boolean>();
  readonly mobileOpenChange = output<boolean>();
  private readonly previewExpanded = signal(false);
  readonly effectiveCollapsed = computed(() => this.collapsed() && !this.previewExpanded() && !this.mobileOpen());

  readonly items: SidebarItem[] = [
    { id: 'dashboard',  labelKey: 'nav.dashboard',  icon: 'dashboard',  group: 'main' },
    { id: 'clients',    labelKey: 'nav.clients',    icon: 'people',     group: 'main' },
    { id: 'leads',      labelKey: 'nav.leads',      icon: 'leads',      group: 'main' },
    { id: 'properties', labelKey: 'nav.properties', icon: 'properties', group: 'main' },
    { id: 'tasks',      labelKey: 'nav.tasks',      icon: 'tasks',      group: 'main' },
    { id: 'maintenance', labelKey: 'nav.maintenance', icon: 'maintenance', group: 'main' },
    { id: 'workflow',   labelKey: 'nav.workflow',   icon: 'workflow',   group: 'main' },
    { id: 'emails',     labelKey: 'nav.emails',     icon: 'emails',     group: 'main' },
  ];

  readonly footerLinks: SidebarLink[] = [
    { labelKey: 'nav.clientsInfo', href: 'https://zortive.homes/clients-info', icon: 'clients-info' },
    { labelKey: 'nav.investmentRequest', href: 'https://zortive.homes/investment-request', icon: 'investment-request' },
  ];

  switchTab(tab: TabType) {
    this.tabChange.emit(tab);
    this.mobileOpenChange.emit(false);
  }

  closeMobileDrawer() {
    this.mobileOpenChange.emit(false);
  }

  toggleCollapse() {
    const nextCollapsed = !this.collapsed();
    this.previewExpanded.set(false);
    this.previewExpandedChange.emit(false);
    this.collapsedChange.emit(nextCollapsed);
  }

  onMouseEnterSidebar() {
    if (!this.collapsed() || !this.supportsHover()) return;
    this.previewExpanded.set(true);
    this.previewExpandedChange.emit(true);
  }

  onMouseLeaveSidebar() {
    if (!this.previewExpanded()) return;
    this.previewExpanded.set(false);
    this.previewExpandedChange.emit(false);
  }

  private supportsHover(): boolean {
    return typeof window === 'undefined' || window.matchMedia('(hover: hover)').matches;
  }
}
