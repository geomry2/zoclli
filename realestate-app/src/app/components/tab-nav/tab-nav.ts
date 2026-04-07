import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type TabType = 'clients' | 'leads' | 'dashboard' | 'properties' | 'tasks';

interface TabNavGroup {
  labelKey: string;
  tabs: Array<{ id: TabType; labelKey: string }>;
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

  readonly groups: TabNavGroup[] = [
    {
      labelKey: 'nav.group.overview',
      tabs: [{ id: 'dashboard', labelKey: 'nav.dashboard' }],
    },
    {
      labelKey: 'nav.group.operations',
      tabs: [{ id: 'tasks', labelKey: 'nav.tasks' }],
    },
    {
      labelKey: 'nav.group.crm',
      tabs: [
        { id: 'clients', labelKey: 'nav.clients' },
        { id: 'leads', labelKey: 'nav.leads' },
        { id: 'properties', labelKey: 'nav.properties' },
      ],
    },
  ];

  switchTab(tab: TabType) {
    this.tabChange.emit(tab);
  }
}
