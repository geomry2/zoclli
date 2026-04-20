import { Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type TabType = 'clients' | 'leads' | 'dashboard' | 'properties' | 'tasks' | 'workflow';

interface SidebarItem {
  id: TabType;
  labelKey: string;
  icon: string;
  group: string;
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
  readonly tabChange = output<TabType>();
  readonly collapsedChange = output<boolean>();
  readonly previewExpandedChange = output<boolean>();
  private readonly previewExpanded = signal(false);
  readonly effectiveCollapsed = computed(() => this.collapsed() && !this.previewExpanded());

  readonly items: SidebarItem[] = [
    { id: 'dashboard',  labelKey: 'nav.dashboard',  icon: 'dashboard',  group: 'main' },
    { id: 'clients',    labelKey: 'nav.clients',    icon: 'people',     group: 'main' },
    { id: 'leads',      labelKey: 'nav.leads',      icon: 'leads',      group: 'main' },
    { id: 'properties', labelKey: 'nav.properties', icon: 'properties', group: 'main' },
    { id: 'tasks',      labelKey: 'nav.tasks',      icon: 'tasks',      group: 'main' },
    { id: 'workflow',   labelKey: 'nav.workflow',   icon: 'workflow',   group: 'main' },
  ];

  switchTab(tab: TabType) {
    this.tabChange.emit(tab);
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
