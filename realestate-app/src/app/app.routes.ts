import type { Routes } from '@angular/router';
import type { TabType } from './components/tab-nav/tab-nav';
import type { FollowUpFilter } from './utils/follow-up.utils';

export type LeadViewMode = 'board' | 'table' | 'followups' | 'insights';

export interface AppRouteState {
  tab: TabType;
  leadsViewMode: LeadViewMode;
  leadFollowUpFilter: FollowUpFilter;
}

export const DEFAULT_LEAD_VIEW: LeadViewMode = 'board';
const FOLLOW_UP_FILTERS: FollowUpFilter[] = ['all', 'overdue', 'today', 'upcoming'];
const LEAD_VIEW_ROUTES: LeadViewMode[] = ['board', 'table', 'followups', 'insights'];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', children: [] },
  { path: 'clients', children: [] },
  { path: 'properties', children: [] },
  { path: 'tasks', children: [] },
  { path: 'maintenance', children: [] },
  { path: 'workflow', children: [] },
  { path: 'emails', children: [] },
  { path: 'leads', pathMatch: 'full', redirectTo: 'leads/board' },
  { path: 'leads/board', children: [] },
  { path: 'leads/table', children: [] },
  { path: 'leads/followups', children: [] },
  { path: 'leads/insights', children: [] },
  { path: '**', redirectTo: 'dashboard' },
];

export function parseAppUrl(url: string): AppRouteState {
  const [pathPart, queryPart = ''] = url.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments[0] === 'clients') {
    return leadRouteState('clients');
  }

  if (segments[0] === 'properties') {
    return leadRouteState('properties');
  }

  if (segments[0] === 'tasks') {
    return leadRouteState('tasks');
  }

  if (segments[0] === 'maintenance') {
    return leadRouteState('maintenance');
  }

  if (segments[0] === 'workflow') {
    return leadRouteState('workflow');
  }

  if (segments[0] === 'emails') {
    return leadRouteState('emails');
  }

  if (segments[0] === 'leads') {
    const view = LEAD_VIEW_ROUTES.includes(segments[1] as LeadViewMode)
      ? (segments[1] as LeadViewMode)
      : DEFAULT_LEAD_VIEW;
    const filter = normalizeFollowUpFilter(new URLSearchParams(queryPart).get('filter'));
    return {
      tab: 'leads',
      leadsViewMode: view,
      leadFollowUpFilter: view === 'followups' ? filter : 'all',
    };
  }

  return leadRouteState('dashboard');
}

export function routeForTab(tab: TabType): string {
  switch (tab) {
    case 'dashboard':
      return '/dashboard';
    case 'clients':
      return '/clients';
    case 'leads':
      return routeForLeadView(DEFAULT_LEAD_VIEW);
    case 'properties':
      return '/properties';
    case 'tasks':
      return '/tasks';
    case 'maintenance':
      return '/maintenance';
    case 'workflow':
      return '/workflow';
    case 'emails':
      return '/emails';
  }
}

export function routeForLeadView(view: LeadViewMode, filter: FollowUpFilter = 'all'): string {
  if (view !== 'followups' || filter === 'all') {
    return `/leads/${view}`;
  }

  return `/leads/followups?filter=${encodeURIComponent(filter)}`;
}

function normalizeFollowUpFilter(value: string | null): FollowUpFilter {
  return FOLLOW_UP_FILTERS.includes(value as FollowUpFilter)
    ? (value as FollowUpFilter)
    : 'all';
}

function leadRouteState(tab: Exclude<TabType, 'leads'>): AppRouteState {
  return {
    tab,
    leadsViewMode: DEFAULT_LEAD_VIEW,
    leadFollowUpFilter: 'all',
  };
}
