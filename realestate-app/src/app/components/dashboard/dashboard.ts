import { Component, computed, inject, output, signal, OnInit } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
import { ActivityService, ActivityEntry } from '../../services/activity.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { countByFollowUpFilter, FollowUpFilter } from '../../utils/follow-up.utils';
import { getCommissionAmount } from '../../utils/commission.utils';

interface StatRow { label: string; count: number; color: string; }

interface MonthlyData {
  month: string;
  revenue: number;
  commissions: number;
  profit: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  readonly followUpsRequest = output<FollowUpFilter>();
  readonly ts = inject(TranslationService);
  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);
  private readonly activityService = inject(ActivityService);

  readonly animatedIn = signal(false);
  readonly chartReady = signal(false);

  readonly recentActivity = computed(() => this.activityService.activities().slice(0, 20));
  readonly visibleClients = computed(() =>
    this.clientService.clients().filter(client => client.status !== 'closed')
  );

  readonly totalClients = computed(() => this.visibleClients().length);
  readonly totalLeads = computed(() => this.leadService.leads().length);

  readonly totalRevenue = computed(() =>
    this.visibleClients().reduce((sum, c) => sum + (c.dealValue ?? 0), 0)
  );

  readonly totalCommissions = computed(() =>
    this.visibleClients().reduce((sum, c) => sum + getCommissionAmount(c), 0)
  );

  readonly totalProfit = computed(() => this.totalRevenue() - this.totalCommissions());

  readonly avgDeal = computed(() => {
    const completed = this.visibleClients().filter(client => this.isCompletedDeal(client));
    return completed.length ? this.totalRevenue() / completed.length : 0;
  });

  readonly overdueCount = computed(() => {
    return countByFollowUpFilter(this.leadService.leads(), 'overdue');
  });

  readonly dueTodayCount = computed(() => {
    return countByFollowUpFilter(this.leadService.leads(), 'today');
  });

  readonly completedDeals = computed(() =>
    this.visibleClients().filter(client => this.isCompletedDeal(client)).length
  );

  readonly completedDealsPercent = computed(() => {
    const total = this.totalClients();
    return total ? Math.round(this.completedDeals() / total * 100) : 0;
  });

  /** Pipeline conversion: clients / (clients + all leads) */
  readonly pipelineConversion = computed(() => {
    const total = this.totalClients() + this.totalLeads();
    return total ? Math.round(this.totalClients() / total * 100) : 0;
  });

  /** New leads this month (leads with firstInteractionDate in current month) */
  readonly newLeadsThisMonth = computed(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return this.leadService.leads().filter(l => {
      if (!l.firstInteractionDate) return false;
      const d = new Date(l.firstInteractionDate);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
  });

  readonly leadsByStatus = computed((): StatRow[] => {
    const leads = this.leadService.leads();
    const colorMap: Record<string, string> = {
      new: '#3B82F6',
      contacted: '#F59E0B',
      negotiating: '#8B5CF6',
      lost: '#EF4444',
    };
    const order = ['new', 'contacted', 'negotiating', 'lost'];
    return order.map(s => ({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      count: leads.filter(l => l.status === s).length,
      color: colorMap[s],
    }));
  });

  readonly clientsByStatus = computed((): StatRow[] => {
    const clients = this.visibleClients();
    const colorMap: Record<string, string> = {
      active: '#22C55E',
      inactive: '#94A3B8',
    };
    const order = ['active', 'inactive'];
    return order.map(s => ({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      count: clients.filter(c => c.status === s).length,
      color: colorMap[s],
    }));
  });

  readonly activeClientsCount = computed(() =>
    this.visibleClients().filter(c => c.status === 'active').length
  );

  readonly winRate = computed((): number | null => {
    const won = this.visibleClients().length;
    const lost = this.leadService.leads().filter(l => l.status === 'lost').length;
    const total = won + lost;
    return total === 0 ? null : Math.round(won / total * 100);
  });

  readonly propertyMix = computed(() => {
    const clients = this.visibleClients();
    const total = clients.length || 1;
    const types = ['apartment', 'house', 'villa', 'commercial', 'land'];
    const colors: Record<string, string> = {
      apartment: '#3B82F6',
      house: '#22C55E',
      villa: '#8B5CF6',
      commercial: '#F59E0B',
      land: '#B87333',
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
    for (const c of this.visibleClients()) {
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

  /** Monthly revenue data for the chart: Revenue, Commissions, Net Profit */
  readonly monthlyRevenue = computed((): MonthlyData[] => {
    const monthFormatter = new Intl.DateTimeFormat(this.locale(), { month: 'short' });
    const clients = this.visibleClients();
    const monthlyRev = new Array(12).fill(0);
    const monthlyComm = new Array(12).fill(0);

    for (const c of clients) {
      if (c.purchaseDate) {
        const d = new Date(c.purchaseDate);
        const m = d.getMonth();
        monthlyRev[m] += c.dealValue ?? 0;
        monthlyComm[m] += getCommissionAmount(c);
      }
    }

    return Array.from({ length: 12 }, (_, i) => ({
      month: monthFormatter.format(new Date(2026, i, 1)).replace('.', ''),
      revenue: monthlyRev[i],
      commissions: monthlyComm[i],
      profit: monthlyRev[i] - monthlyComm[i],
    }));
  });

  readonly chartMaxValue = computed(() => {
    const data = this.monthlyRevenue();
    const allValues = data.flatMap(d => [d.revenue, d.commissions, d.profit]);
    return Math.max(...allValues, 1);
  });

  readonly revenuePath = computed(() => this.buildChartPath('revenue'));
  readonly commissionsPath = computed(() => this.buildChartPath('commissions'));
  readonly profitPath = computed(() => this.buildChartPath('profit'));

  readonly chartSummary = computed(() => {
    const data = this.monthlyRevenue();
    return {
      revenue: data.reduce((s, d) => s + d.revenue, 0),
      commissions: data.reduce((s, d) => s + d.commissions, 0),
      profit: data.reduce((s, d) => s + d.profit, 0),
    };
  });

  readonly revenueTrend = computed(() => this.calcTrend('revenue'));
  readonly commissionsTrend = computed(() => this.calcTrend('commissions'));
  readonly profitTrend = computed(() => this.calcTrend('profit'));

  readonly activeChartFilter = signal<'all' | 'revenue' | 'commissions' | 'profit'>('all');

  /** Visit statistic mini sparkline points (derived from activity timestamps) */
  readonly activitySparkline = computed(() => {
    const acts = this.activityService.activities();
    // Group last 7 days
    const now = Date.now();
    const days = [0, 0, 0, 0, 0, 0, 0];
    for (const a of acts) {
      const age = Math.floor((now - new Date(a.timestamp).getTime()) / 86400000);
      if (age >= 0 && age < 7) days[6 - age]++;
    }
    const max = Math.max(...days, 1);
    return days.map(d => Math.round((d / max) * 100));
  });

  ngOnInit() {
    requestAnimationFrame(() => {
      this.animatedIn.set(true);
      setTimeout(() => this.chartReady.set(true), 300);
    });
  }

  setChartFilter(filter: 'all' | 'revenue' | 'commissions' | 'profit') {
    this.activeChartFilter.set(filter);
  }

  private calcTrend(field: 'revenue' | 'commissions' | 'profit'): number {
    const data = this.monthlyRevenue();
    const recent = data.slice(-3).reduce((s, d) => s + d[field], 0);
    const earlier = data.slice(-6, -3).reduce((s, d) => s + d[field], 0);
    if (earlier === 0) return 0;
    return Math.round((recent - earlier) / earlier * 100);
  }

  private buildChartPath(field: 'revenue' | 'commissions' | 'profit'): string {
    const data = this.monthlyRevenue();
    const max = this.chartMaxValue();
    const chartWidth = 720;
    const chartHeight = 200;
    const padding = 40;
    const usableWidth = chartWidth - padding * 2;
    const usableHeight = chartHeight - 20;

    if (data.length === 0 || max === 0) return '';

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * usableWidth;
      const y = chartHeight - 10 - (d[field] / max) * usableHeight;
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
      path += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return path;
  }

  buildAreaPath(field: 'revenue' | 'commissions' | 'profit'): string {
    const linePath = field === 'revenue' ? this.revenuePath() :
                     field === 'commissions' ? this.commissionsPath() : this.profitPath();
    if (!linePath) return '';
    const data = this.monthlyRevenue();
    const chartHeight = 200;
    const padding = 40;
    const usableWidth = 720 - padding * 2;
    const lastX = padding + ((data.length - 1) / (data.length - 1)) * usableWidth;
    return `${linePath} L ${lastX} ${chartHeight - 10} L ${padding} ${chartHeight - 10} Z`;
  }

  formatCurrency(value: number): string {
    if (value >= 1_000_000) return '\u20AC' + new Intl.NumberFormat(this.locale(), {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
    if (value >= 1_000) return '\u20AC' + new Intl.NumberFormat(this.locale(), {
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(value);
    return '\u20AC' + value.toLocaleString(this.locale());
  }

  formatCurrencyShort(value: number): string {
    if (value >= 1_000_000) return '\u20AC' + new Intl.NumberFormat(this.locale(), {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
    if (value >= 1_000) return '\u20AC' + new Intl.NumberFormat(this.locale(), {
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(value);
    return '\u20AC' + value;
  }

  pct(count: number, total: number): number {
    return total === 0 ? 0 : Math.round(count / total * 100);
  }

  activityIcon(entry: ActivityEntry): string {
    if (entry.action === 'created') return '\uFF0B';
    if (entry.action === 'updated') return '\u270F';
    if (entry.action === 'deleted') return '\u2715';
    if (entry.action === 'converted') return '\u2192';
    return '\u00B7';
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
    if (diffMins < 1) return this.ts.t('time.justNow');
    if (diffMins < 60) return this.ts.t('time.minutesAgo', { n: diffMins });
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return this.ts.t('time.hoursAgo', { n: diffHrs });
    return d.toLocaleDateString(this.locale(), { day: 'numeric', month: 'short' }).replace('.', '');
  }

  openFollowUps(filter: FollowUpFilter) {
    this.followUpsRequest.emit(filter);
  }

  private isCompletedDeal(client: { status: string; purchaseDate: string; dealValue: number }): boolean {
    return client.status === 'closed'
      || Boolean(client.purchaseDate)
      || (client.dealValue ?? 0) > 0;
  }

  private locale(): string {
    return this.ts.lang() === 'ru' ? 'ru-RU' : 'en-GB';
  }
}
