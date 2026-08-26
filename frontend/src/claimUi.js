import { Activity, Car, HeartPulse, Stethoscope } from 'lucide-react';

export const documentsByType = {
  MOTOR: ['POLICE_FIR', 'REPAIR_INVOICE'],
  HEALTH: ['HOSPITAL_BILL', 'DISCHARGE_SUMMARY'],
  LIFE: ['DEATH_CERTIFICATE'],
};

export const demoPolicyByType = {
  MOTOR: 'MTR-2026-001',
  HEALTH: 'HLT-2026-001',
  LIFE: 'LIF-2026-001',
};

export const iconByType = { MOTOR: Car, HEALTH: Stethoscope, LIFE: HeartPulse };

export function claimIcon(type) {
  return iconByType[type] ?? Activity;
}

export function money(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(value);
}

export function statusTone(status) {
  if (status === 'SETTLED') return 'green';
  if (status === 'REJECTED') return 'red';
  if (status === 'MANUAL_REVIEW' || status === 'UNDER_REVIEW' || status === 'FILED') return 'amber';
  return 'blue';
}

export function readable(value) {
  return value?.replaceAll('_', ' ') ?? 'Pending';
}
