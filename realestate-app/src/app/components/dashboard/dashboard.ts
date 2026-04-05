import { Component, computed, inject, output } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
import { ActivityService, ActivityEntry } from '../../services/activity.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { countByFollowUpFilter, FollowUpFilter } from '../../utils/follow-up.utils';
import { getCommissionAmount } from '../../utils/commission.utils';

interface StatRow { label: string; count: number; color: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  readonly followUpsRequest = output<FollowUpFilter>();
  readonly ts = inject(TranslationService);
  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);
  private readonly activityService = inject(ActivityService);

  readonly recentActivity = computed(() => this.activityService.activities().slice(0, 20));

  readonly totalClients = computed(() => this.clientService.clients().length);
  readonly totalLeads = computed(() => this.leadService.leads().length);

  readonly totalRevenue = computed(() =>
    this.clientService.clients().reduce((sum, c) => sum + (c.dealValue ?? 0), 0)
  );

  readonly avgDeal = computed(() => {
    const active = this.clientService.clients().filter(c => c.dealValue > 0);
    return active.length ? this.totalRevenue() / active.length : 0;
  });

  readonly overdueCount = computed(() => {
    return countByFollowUpFilter(this.leadService.leads(), 'overdue');
  });

  readonly dueTodayCount = computed(() => {
    return countByFollowUpFilter(this.leadService.leads(), 'today');
  });

  readonly leadsByStatus = computed((): StatRow[] => {
    const leads = this.leadService.leads();
    const total = leads.length || 1;
    const colorMap: Record<string, string> = {
      new: '#4a90d9',
      contacted: '#f0a500',
      negotiating: '#7c5cbf',
      lost: '#e05252',
    };
    const order = ['new', 'contacted', 'negotiating', 'lost'];
    return order.map(s => ({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      count: leads.filter(l => l.status === s).length,
      color: colorMap[s],
      pct: Math.round(leads.filter(l => l.status === s).length / total * 100),
    })) as (StatRow & { pct: number })[];
  });

  readonly clientsByStatus = computed((): StatRow[] => {
    const clients = this.clientService.clients();
    const colorMap: Record<string, string> = {
      active: '#3aaa6e',
      inactive: '#aaa',
      closed: '#e05252',
    };
    const order = ['active', 'inactive', 'closed'];
    return order.map(s => ({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      count: clients.filter(c => c.status === s).length,
      color: colorMap[s],
    }));
  });

  readonly activeClientsCount = computed(() =>
    this.clientService.clients().filter(c => c.status === 'active').length
  );

  readonly winRate = computed((): number | null => {
    const won = this.clientService.clients().length;
    const lost = this.leadService.leads().filter(l => l.status === 'lost').length;
    const total = won + lost;
    return total === 0 ? null : Math.round(won / total * 100);
  });

  readonly propertyMix = computed(() => {
    const clients = this.clientService.clients();
    const total = clients.length || 1;
    const types = ['apartment', 'house', 'villa', 'commercial', 'land'];
    const colors: Record<string, string> = {
      apartment: '#4a90d9',
      house: '#3aaa6e',
      villa: '#7c5cbf',
      commercial: '#f0a500',
      land: '#b87333',
    };
    return types
      .map(t => ({
        label: t,
        count: clients.filter(c => c.propertyType === t).length,
        color: colors[t],
        pct: Math.round(clients.filter(c => c.propertyType === t).length / total * 100),
      }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);
  });

  readonly topRealtors = computed(() => {
    const map = new Map<string, { deals: number; earnings: number }>();
    for (const c of this.clientService.clients()) {
      if (!c.realtorName) continue;
      const existing = map.get(c.realtorName) ?? { deals: 0, earnings: 0 };
      map.set(c.realtorName, {
        deals: existing.deals + 1,
        earnings: existing.earnings + getCommissionAmount(c),
      });
    }
    for (const l of this.leadService.leads()) {
      if (!l.realtorName) continue;
      if (!map.has(l.realtorName)) map.set(l.realtorName, { deals: 0, earnings: 0 });
    }
    return [...map.entries()]
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.earnings - a.earnings || b.deals - a.deals)
      .slice(0, 5);
  });

  formatCurrency(value: number): string {
    if (value >= 1_000_000) return '€' + (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return '€' + (value / 1_000).toFixed(0) + 'K';
    return '€' + value.toLocaleString('en-US');
  }

  pct(count: number, total: number): number {
    return total === 0 ? 0 : Math.round(count / total * 100);
  }

  activityIcon(entry: ActivityEntry): string {
    if (entry.action === 'created') return '＋';
    if (entry.action === 'updated') return '✏';
    if (entry.action === 'deleted') return '✕';
    if (entry.action === 'converted') return '→';
    return '·';
  }

  activityKey(entry: ActivityEntry): string {
    const t = entry.entityType;
    if (entry.action === 'converted') return 'act.converted';
    const map: Record<string, string> = {
      created: t === 'client' ? 'act.createdClient' : 'act.createdLead',
      updated: t === 'client' ? 'act.updatedClient' : 'act.updatedLead',
      deleted: t === 'client' ? 'act.deletedClient' : 'act.deletedLead',
    };
    return map[entry.action] ?? entry.action;
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  openFollowUps(filter: FollowUpFilter) {
    this.followUpsRequest.emit(filter);
  }
}
