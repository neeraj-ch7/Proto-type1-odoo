import React from 'react';

/**
 * Editorial Status Badge
 * Matches CONTRACT section 10:
 * PAID = ink fill
 * CONFIRMED = ink outline
 * OVERDUE = maroon fill
 * DRAFT = dashed outline
 * CANCELLED = muted
 * ACTIVE = deep ink / maroon
 * QUOTATION = ink outline dotted
 * CLOSED = muted filled
 */
export default function StatusBadge({ status, className = '' }) {
  if (!status) return null;

  const s = String(status).toLowerCase().trim();

  let style = 'border border-line text-line bg-transparent';
  let label = status.toUpperCase();

  switch (s) {
    case 'paid':
      style = 'bg-ink text-cream border border-ink';
      break;
    case 'overdue':
      style = 'bg-maroon text-white border border-maroon';
      break;
    case 'confirmed':
      style = 'bg-white text-ink border border-ink';
      break;
    case 'draft':
      style = 'bg-white text-ink border border-dashed border-ink';
      break;
    case 'active':
      style = 'bg-[#1A1614] text-cream border border-[#1A1614]';
      break;
    case 'quotation':
      style = 'bg-white text-ink border border-dotted border-ink';
      break;
    case 'closed':
    case 'cancelled':
      style = 'bg-neutral-200 text-line border border-neutral-300';
      break;
    case 'paused':
      style = 'bg-amber-100 text-amber-900 border border-amber-400';
      break;
    default:
      style = 'border border-line text-line';
  }

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] select-none ${style} ${className}`}
    >
      {label}
    </span>
  );
}
