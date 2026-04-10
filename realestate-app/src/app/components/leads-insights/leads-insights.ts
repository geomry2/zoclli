import { Component, computed, inject, input, output } from '@angular/core';
import { Lead, LeadStatus } from '../../models/lead.model';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LeadService } from '../../services/lead.service';
import { TranslationService } from '../../services/translation.service';
import { applySearch } from '../../utils/csv.utils';

interface InsightLead {
  lead: Lead;
  expectedBudget: number;
  project: string;
}

interface HeroMetric {
  labelKey: string;
  value: string;
  helperKey: string;
  accent: 'blue' | 'emerald' | 'amber' | 'violet';
}

interface ProjectDemandRow {
  name: string;
  count: number;
  amount: number;
  avgBudget: number;
  pct: number;
}

interface StatusInsightRow {
  status: LeadStatus;
  count: number;
  amount: number;
  pct: number;
  color: string;
}

interface BudgetBucketRow {
  key: string;
  labelKey: string;
  count: number;
  amount: number;
  pct: number;
  color: string;
}

interface MonthlyFlowRow {
  label: string;
  count: number;
  amount: number;
  height: number;
}

const STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'negotiating', 'lost'];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: '#3B82F6',
  contacted: '#F59E0B',
  negotiating: '#8B5CF6',
  lost: '#EF4444',
};

const BUDGET_BUCKET_DEFS = [
  { key: 'under100', labelKey: 'leadInsights.bucket.under100', color: '#60A5FA', match: (value: number) => value > 0 && value < 100_000 },
  { key: '100to200', labelKey: 'leadInsights.bucket.100to200', color: '#22C55E', match: (value: number) => value >= 100_000 && value < 200_000 },
  { key: '200to350', labelKey: 'leadInsights.bucket.200to350', color: '#14B8A6', match: (value: number) => value >= 200_000 && value < 350_000 },
  { key: '350plus', labelKey: 'leadInsights.bucket.350plus', color: '#F97316', match: (value: number) => value >= 350_000 },
  { key: 'unknown', labelKey: 'leadInsights.bucket.unknown', color: '#94A3B8', match: (value: number) => value === 0 },
] as const;

@Component({
  selector: 'app-leads-insights',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './leads-insights.html',
  styleUrl: './leads-insights.scss',
})
export class LeadsInsights {
  readonly searchQuery = input<string>('');
  readonly editRequest = output<Lead>();

  readonly ts = inject(TranslationService);
  private readonly leadService = inject(LeadService);

  readonly filteredLeads = computed(() =>
    applySearch(
      this.leadService.leads() as unknown as Record<string, unknown>[],
      this.searchQuery(),
    ) as unknown as Lead[],
  );

  readonly insightLeads = computed<InsightLead[]>(() =>
    this.filteredLeads().map(lead => ({
      lead,
      expectedBudget: this.estimateBudget(lead),
      project: this.projectLabel(lead.interestedIn),
    })),
  );

  readonly totalPotentialBudget = computed(() =>
    this.insightLeads().reduce((sum, item) => sum + item.expectedBudget, 0),
  );

  readonly averageExpectedBudget = computed(() => {
    const withBudget = this.insightLeads().filter(item => item.expectedBudget > 0);
    if (withBudget.length === 0) return 0;
    return Math.round(withBudget.reduce((sum, item) => sum + item.expectedBudget, 0) / withBudget.length);
  });

  readonly trackedProjects = computed(() =>
    new Set(
      this.filteredLeads()
        .map(lead => lead.interestedIn.trim())
        .filter(Boolean),
    ).size,
  );

  readonly scheduledFollowUps = computed(() =>
    this.filteredLeads().filter(lead => Boolean(lead.followUpDate)).length,
  );

  readonly heroMetrics = computed<HeroMetric[]>(() => [
    {
      labelKey: 'dash.totalLeads',
      value: String(this.filteredLeads().length),
      helperKey: 'leadInsights.metric.totalLeads',
      accent: 'blue',
    },
    {
      labelKey: 'leadInsights.totalPotential',
      value: this.formatCurrency(this.totalPotentialBudget()),
      helperKey: 'leadInsights.metric.totalPotential',
      accent: 'emerald',
    },
    {
      labelKey: 'leadInsights.avgBudget',
      value: this.formatCurrency(this.averageExpectedBudget()),
      helperKey: 'leadInsights.metric.avgBudget',
      accent: 'amber',
    },
    {
      labelKey: 'leadInsights.trackedProjects',
      value: String(this.trackedProjects()),
      helperKey: 'leadInsights.metric.trackedProjects',
      accent: 'violet',
    },
  ]);

  readonly projectDemand = computed<ProjectDemandRow[]>(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const item of this.insightLeads()) {
      const current = map.get(item.project) ?? { count: 0, amount: 0 };
      map.set(item.project, {
        count: current.count + 1,
        amount: current.amount + item.expectedBudget,
      });
    }

    const total = this.filteredLeads().length;
    return [...map.entries()]
      .map(([name, value]) => ({
        name,
        count: value.count,
        amount: value.amount,
        avgBudget: value.count ? Math.round(value.amount / value.count) : 0,
        pct: this.pct(value.count, total),
      }))
      .sort((left, right) => right.amount - left.amount || right.count - left.count || left.name.localeCompare(right.name))
      .slice(0, 6);
  });

  readonly statusRows = computed<StatusInsightRow[]>(() => {
    const total = this.filteredLeads().length;
    return STATUS_ORDER.map(status => {
      const rows = this.insightLeads().filter(item => item.lead.status === status);
      const amount = rows.reduce((sum, item) => sum + item.expectedBudget, 0);
      return {
        status,
        count: rows.length,
        amount,
        pct: this.pct(rows.length, total),
        color: STATUS_COLORS[status],
      };
    });
  });

  readonly budgetBuckets = computed<BudgetBucketRow[]>(() => {
    const total = this.filteredLeads().length;
    return BUDGET_BUCKET_DEFS.map(bucket => {
      const rows = this.insightLeads().filter(item => bucket.match(item.expectedBudget));
      return {
        key: bucket.key,
        labelKey: bucket.labelKey,
        count: rows.length,
        amount: rows.reduce((sum, item) => sum + item.expectedBudget, 0),
        pct: this.pct(rows.length, total),
        color: bucket.color,
      };
    });
  });

  readonly monthlyFlow = computed<MonthlyFlowRow[]>(() => {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat(this.locale(), { month: 'short' });
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: formatter.format(date).replace('.', ''),
        count: 0,
        amount: 0,
      };
    });

    const bucketIndex = new Map(buckets.map((bucket, index) => [bucket.key, index]));

    for (const item of this.insightLeads()) {
      if (!item.lead.firstInteractionDate) continue;
      const date = new Date(item.lead.firstInteractionDate);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const index = bucketIndex.get(key);
      if (index === undefined) continue;
      buckets[index].count += 1;
      buckets[index].amount += item.expectedBudget;
    }

    const maxCount = Math.max(...buckets.map(bucket => bucket.count), 1);
    return buckets.map(bucket => ({
      label: bucket.label,
      count: bucket.count,
      amount: bucket.amount,
      height: bucket.count === 0 ? 0 : Math.max(16, Math.round(bucket.count / maxCount * 100)),
    }));
  });

  readonly spotlightLeads = computed(() =>
    [...this.insightLeads()]
      .sort((left, right) => {
        if (right.expectedBudget !== left.expectedBudget) {
          return right.expectedBudget - left.expectedBudget;
        }

        const leftFollowUp = this.followUpSortValue(left.lead.followUpDate);
        const rightFollowUp = this.followUpSortValue(right.lead.followUpDate);
        if (leftFollowUp !== rightFollowUp) {
          return leftFollowUp - rightFollowUp;
        }

        return left.lead.name.localeCompare(right.lead.name);
      })
      .slice(0, 8),
  );

  openLead(lead: Lead) {
    this.editRequest.emit(lead);
  }

  formatCurrency(value: number): string {
    if (value <= 0) return this.ts.t('leadInsights.noBudget');
    return '\u20AC' + value.toLocaleString(this.locale());
  }

  formatCompactCurrency(value: number): string {
    if (value <= 0) return '0';
    return '\u20AC' + new Intl.NumberFormat(this.locale(), {
      notation: 'compact',
      maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
    }).format(value);
  }

  formatBudgetRange(lead: Lead): string {
    const min = Math.max(0, lead.budgetMin ?? 0);
    const max = Math.max(0, lead.budgetMax ?? 0);

    if (min > 0 && max > 0) {
      const low = Math.min(min, max);
      const high = Math.max(min, max);
      return '\u20AC' + low.toLocaleString(this.locale()) + ' - ' + '\u20AC' + high.toLocaleString(this.locale());
    }

    if (max > 0) return '\u20AC' + max.toLocaleString(this.locale());
    if (min > 0) return '\u20AC' + min.toLocaleString(this.locale());
    return this.ts.t('leadInsights.noBudget');
  }

  formatFollowUp(date: string): string {
    if (!date) return this.ts.t('followUps.noDate');
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return this.ts.t('followUps.noDate');
    return parsed.toLocaleDateString(this.locale(), { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
  }

  private estimateBudget(lead: Lead): number {
    const min = Math.max(0, lead.budgetMin ?? 0);
    const max = Math.max(0, lead.budgetMax ?? 0);

    if (min > 0 && max > 0) {
      return Math.round((Math.min(min, max) + Math.max(min, max)) / 2);
    }

    return max || min || 0;
  }

  private projectLabel(value: string): string {
    const normalized = value.trim();
    return normalized || this.ts.t('leadInsights.noProject');
  }

  private pct(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round(count / total * 100);
  }

  private followUpSortValue(date: string): number {
    if (!date) return Number.POSITIVE_INFINITY;
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
  }

  private locale(): string {
    return this.ts.lang() === 'ru' ? 'ru-RU' : 'en-GB';
  }
}
