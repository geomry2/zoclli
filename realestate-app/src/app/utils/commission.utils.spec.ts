import {
  formatCommissionValue,
  getCommissionAmount,
  normalizeCommissionType,
  normalizeCommissionValue,
} from './commission.utils';

describe('commission utils', () => {
  it('normalizes commission values and defaults the type to percent', () => {
    expect(normalizeCommissionType(undefined)).toBe('percent');
    expect(normalizeCommissionType('fixed')).toBe('fixed');
    expect(normalizeCommissionValue('12.5')).toBe(12.5);
    expect(normalizeCommissionValue(-4)).toBe(0);
  });

  it('calculates fixed and percentage commissions from a deal', () => {
    expect(getCommissionAmount({ dealValue: 200000, commissionType: 'percent', commissionValue: 3 })).toBe(6000);
    expect(getCommissionAmount({ dealValue: 200000, commissionType: 'fixed', commissionValue: 7500 })).toBe(7500);
  });

  it('formats commission values for display', () => {
    expect(formatCommissionValue('percent', 2.5)).toBe('2.5%');
    expect(formatCommissionValue('fixed', 4500)).toBe('€4,500');
  });
});
