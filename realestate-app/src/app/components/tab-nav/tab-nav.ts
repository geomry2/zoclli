import { Component, input, output } from '@angular/core';

export type TabType = 'clients' | 'leads' | 'dashboard';

@Component({
  selector: 'app-tab-nav',
  standalone: true,
  templateUrl: './tab-nav.html',
  styleUrl: './tab-nav.scss'
})
export class TabNav {
  readonly activeTab = input<TabType>('clients');
  readonly tabChange = output<TabType>();

  switchTab(tab: TabType) {
    this.tabChange.emit(tab);
  }
}
