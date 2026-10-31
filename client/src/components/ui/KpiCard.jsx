import React from 'react';

/**
 * Editorial KpiCard
 * Variants: 'maroon' | 'maroonDeep' | 'ink' | 'outlined' | 'default'
 * Fully responsive and flexible for any screen width.
 */
export default function KpiCard({
  label,
  value,
  subtitle,
  variant = 'default',
  icon: Icon,
  className = '',
}) {
  const styles = {
    maroon: {
      card: 'bg-maroon text-white border border-maroon',
      label: 'text-cream/80',
      value: 'text-white',
      subtitle: 'text-cream/70',
    },
    maroonDeep: {
      card: 'bg-maroonDeep text-white border border-maroonDeep',
      label: 'text-cream/80',
      value: 'text-white',
      subtitle: 'text-cream/70',
    },
    ink: {
      card: 'bg-ink text-cream border border-ink',
      label: 'text-cream/70',
      value: 'text-cream',
      subtitle: 'text-cream/60',
    },
    outlined: {
      card: 'bg-white text-ink border border-ink',
      label: 'text-line',
      value: 'text-maroon',
      subtitle: 'text-line',
    },
    default: {
      card: 'bg-white text-ink border border-line',
      label: 'text-line',
      value: 'text-ink',
      subtitle: 'text-line',
    },
  };

  const current = styles[variant] || styles.default;

  return (
    <div
      className={`p-4 sm:p-5 transition-transform ${current.card} ${className} min-w-0 overflow-hidden flex flex-col justify-between`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em] truncate ${current.label}`}
            title={label}
          >
            {label}
          </span>
          {Icon && <Icon className="w-4 h-4 opacity-70 flex-shrink-0" />}
        </div>
        <div
          className={`text-xl sm:text-2xl xl:text-3xl font-black font-mono tracking-tight mt-2 truncate ${current.value}`}
          title={String(value ?? '—')}
        >
          {value ?? '—'}
        </div>
      </div>
      {subtitle && (
        <div
          className={`text-[10px] uppercase tracking-wider mt-2 line-clamp-1 sm:line-clamp-2 ${current.subtitle}`}
          title={subtitle}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
