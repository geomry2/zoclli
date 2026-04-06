import { Component, inject, input, output } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type TabType = 'clients' | 'leads' | 'dashboard' | 'properties' | 'tasks';

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

  switchTab(tab: TabType) {
    this.tabChange.emit(tab);
  }
}
