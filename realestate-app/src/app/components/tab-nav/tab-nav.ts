import { Component, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type TabType = 'clients' | 'leads' | 'dashboard' | 'properties' | 'tasks';

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
  readonly tabChange = output<TabType>();
  readonly collapsed = signal(true);

  readonly items: SidebarItem[] = [
    { id: 'dashboard',  labelKey: 'nav.dashboard',  icon: 'dashboard',  group: 'main' },
    { id: 'clients',    labelKey: 'nav.clients',    icon: 'people',     group: 'main' },
    { id: 'leads',      labelKey: 'nav.leads',      icon: 'leads',      group: 'main' },
    { id: 'properties', labelKey: 'nav.properties', icon: 'properties', group: 'main' },
    { id: 'tasks',      labelKey: 'nav.tasks',      icon: 'tasks',      group: 'main' },
  ];

  switchTab(tab: TabType) {
    this.tabChange.emit(tab);
  }

  toggleCollapse() {
    this.collapsed.set(!this.collapsed());
  }
}
