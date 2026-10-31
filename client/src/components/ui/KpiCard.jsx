import React from 'react';

/**
 * Editorial KpiCard
 * Variants: 'maroon' | 'maroonDeep' | 'ink' | 'outlined' | 'default'
 * @param {string} label
 * @param {string|number} value
 * @param {string} subtitle
 * @param {'maroon' | 'maroonDeep' | 'ink' | 'outlined' | 'default'} variant
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
    <div className={`p-5 transition-transform ${current.card} ${className}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${current.label}`}>
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 opacity-70" />}
      </div>
      <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-2 ${current.value}`}>
        {value ?? '—'}
      </div>
      {subtitle && (
        <div className={`text-[10px] uppercase tracking-wider mt-1.5 ${current.subtitle}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
