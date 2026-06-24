import { parseAppUrl, routeForLeadView, routeForTab } from './app.routes';

describe('app.routes', () => {
  it('maps tab URLs to the expected shell state', () => {
    expect(parseAppUrl('/dashboard')).toEqual({
      tab: 'dashboard',
      leadsViewMode: 'board',
      leadFollowUpFilter: 'all',
    });
    expect(parseAppUrl('/clients')).toEqual({
      tab: 'clients',
      leadsViewMode: 'board',
      leadFollowUpFilter: 'all',
    });
    expect(parseAppUrl('/properties')).toEqual({
      tab: 'properties',
      leadsViewMode: 'board',
      leadFollowUpFilter: 'all',
    });
    expect(parseAppUrl('/emails')).toEqual({
      tab: 'emails',
      leadsViewMode: 'board',
      leadFollowUpFilter: 'all',
    });
    expect(parseAppUrl('/maintenance')).toEqual({
      tab: 'maintenance',
      leadsViewMode: 'board',
      leadFollowUpFilter: 'all',
    });
  });

  it('maps lead subviews and follow-up filters from the URL', () => {
    expect(parseAppUrl('/leads/table')).toEqual({
      tab: 'leads',
      leadsViewMode: 'table',
      leadFollowUpFilter: 'all',
    });
    expect(parseAppUrl('/leads/followups?filter=today')).toEqual({
      tab: 'leads',
      leadsViewMode: 'followups',
      leadFollowUpFilter: 'today',
    });
    expect(parseAppUrl('/leads/unknown?filter=nope')).toEqual({
      tab: 'leads',
      leadsViewMode: 'board',
      leadFollowUpFilter: 'all',
    });
  });

  it('builds canonical URLs for tabs and lead views', () => {
    expect(routeForTab('dashboard')).toBe('/dashboard');
    expect(routeForTab('leads')).toBe('/leads/board');
    expect(routeForTab('maintenance')).toBe('/maintenance');
    expect(routeForTab('emails')).toBe('/emails');
    expect(routeForLeadView('board')).toBe('/leads/board');
    expect(routeForLeadView('followups', 'all')).toBe('/leads/followups');
    expect(routeForLeadView('followups', 'upcoming')).toBe('/leads/followups?filter=upcoming');
  });
});
