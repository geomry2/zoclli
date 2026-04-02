import { Component, signal } from '@angular/core';
import { SearchBar } from './components/search-bar/search-bar';
import { TabNav, TabType } from './components/tab-nav/tab-nav';
import { ClientsTable } from './components/clients-table/clients-table';
import { LeadsTable } from './components/leads-table/leads-table';
import { CreateModal } from './components/create-modal/create-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SearchBar, TabNav, ClientsTable, LeadsTable, CreateModal],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly activeTab = signal<TabType>('clients');
  readonly searchQuery = signal<string>('');
  readonly showCreateModal = signal(false);

  switchTab(tab: TabType) {
    this.activeTab.set(tab);
    this.searchQuery.set('');
  }

  onQueryChange(query: string) {
    this.searchQuery.set(query);
  }
}
