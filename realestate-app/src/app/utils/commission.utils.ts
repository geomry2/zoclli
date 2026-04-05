import { CommissionType } from '../models/client.model';

interface CommissionLike {
  dealValue?: unknown;
  commissionType?: unknown;
  commissionValue?: unknown;
}

export function normalizeCommissionType(value: unknown): CommissionType {
  return value === 'fixed' ? 'fixed' : 'percent';
}

export function normalizeCommissionValue(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
}

export function getCommissionAmount(record: CommissionLike): number {
  const dealValue = normalizeMoney(record.dealValue);
  const commissionType = normalizeCommissionType(record.commissionType);
  const commissionValue = normalizeCommissionValue(record.commissionValue);

  return commissionType === 'fixed'
    ? commissionValue
    : dealValue * commissionValue / 100;
}

export function formatCommissionValue(commissionType: CommissionType, commissionValue: number): string {
  const normalizedValue = normalizeCommissionValue(commissionValue);
  const formattedValue = normalizedValue.toLocaleString('en-US', { maximumFractionDigits: 2 });

  return commissionType === 'fixed'
    ? `€${formattedValue}`
    : `${formattedValue}%`;
}

function normalizeMoney(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
}
