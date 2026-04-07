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
  income: number;
  expenses: number;
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

  readonly completedDeals = computed(() =>
    this.clientService.clients().filter(c => c.status === 'closed').length
  );

  readonly completedDealsPercent = computed(() => {
    const total = this.totalClients();
    return total ? Math.round(this.completedDeals() / total * 100) : 0;
  });

  readonly revenuePercent = computed(() => {
    // Show as percentage of a reasonable target
    const rev = this.totalRevenue();
    return rev > 0 ? Math.min(100, Math.round(rev / (rev * 1.5) * 100)) : 0;
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
    const clients = this.clientService.clients();
    const colorMap: Record<string, string> = {
      active: '#22C55E',
      inactive: '#94A3B8',
      closed: '#EF4444',
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

  /** Generate monthly revenue data for the chart */
  readonly monthlyRevenue = computed((): MonthlyData[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const clients = this.clientService.clients();
    const monthlyIncome = new Array(12).fill(0);

    for (const c of clients) {
      if (c.purchaseDate) {
        const d = new Date(c.purchaseDate);
        const m = d.getMonth();
        monthlyIncome[m] += c.dealValue ?? 0;
      }
    }

    return months.map((month, i) => {
      const income = monthlyIncome[i];
      const expenses = Math.round(income * 0.65);
      return { month, income, expenses, profit: income - expenses };
    });
  });

  readonly chartMaxValue = computed(() => {
    const data = this.monthlyRevenue();
    const allValues = data.flatMap(d => [d.income, d.expenses, d.profit]);
    return Math.max(...allValues, 1);
  });

  /** SVG path data for the revenue chart lines */
  readonly incomePath = computed(() => this.buildChartPath('income'));
  readonly expensesPath = computed(() => this.buildChartPath('expenses'));
  readonly profitPath = computed(() => this.buildChartPath('profit'));

  readonly chartRevenueSummary = computed(() => {
    const data = this.monthlyRevenue();
    return {
      income: data.reduce((s, d) => s + d.income, 0),
      expenses: data.reduce((s, d) => s + d.expenses, 0),
      profit: data.reduce((s, d) => s + d.profit, 0),
    };
  });

  readonly incomeTrend = computed(() => {
    const data = this.monthlyRevenue();
    const recent = data.slice(-3).reduce((s, d) => s + d.income, 0);
    const earlier = data.slice(-6, -3).reduce((s, d) => s + d.income, 0);
    if (earlier === 0) return 0;
    return Math.round((recent - earlier) / earlier * 100);
  });

  readonly expensesTrend = computed(() => {
    const data = this.monthlyRevenue();
    const recent = data.slice(-3).reduce((s, d) => s + d.expenses, 0);
    const earlier = data.slice(-6, -3).reduce((s, d) => s + d.expenses, 0);
    if (earlier === 0) return 0;
    return Math.round((recent - earlier) / earlier * 100);
  });

  readonly profitTrend = computed(() => {
    const data = this.monthlyRevenue();
    const recent = data.slice(-3).reduce((s, d) => s + d.profit, 0);
    const earlier = data.slice(-6, -3).reduce((s, d) => s + d.profit, 0);
    if (earlier === 0) return 0;
    return Math.round((recent - earlier) / earlier * 100);
  });

  readonly activeChartFilter = signal<'all' | 'income' | 'expenses' | 'profit'>('all');

  ngOnInit() {
    requestAnimationFrame(() => {
      this.animatedIn.set(true);
      setTimeout(() => this.chartReady.set(true), 300);
    });
  }

  setChartFilter(filter: 'all' | 'income' | 'expenses' | 'profit') {
    this.activeChartFilter.set(filter);
  }

  private buildChartPath(field: 'income' | 'expenses' | 'profit'): string {
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

    // Smooth curve using cubic bezier
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

  buildAreaPath(field: 'income' | 'expenses' | 'profit'): string {
    const linePath = field === 'income' ? this.incomePath() :
                     field === 'expenses' ? this.expensesPath() : this.profitPath();
    if (!linePath) return '';
    const data = this.monthlyRevenue();
    const chartWidth = 720;
    const chartHeight = 200;
    const padding = 40;
    const usableWidth = chartWidth - padding * 2;
    const lastX = padding + ((data.length - 1) / (data.length - 1)) * usableWidth;
    return `${linePath} L ${lastX} ${chartHeight - 10} L ${padding} ${chartHeight - 10} Z`;
  }

  formatCurrency(value: number): string {
    if (value >= 1_000_000) return '\u20AC' + (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return '\u20AC' + (value / 1_000).toFixed(0) + 'K';
    return '\u20AC' + value.toLocaleString('en-US');
  }

  formatCurrencyShort(value: number): string {
    if (value >= 1_000_000) return '\u20AC' + (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return '\u20AC' + Math.round(value / 1_000) + 'K';
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
