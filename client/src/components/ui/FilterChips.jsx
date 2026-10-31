import React from 'react';

/**
 * Editorial FilterChips
 * @param {Array<{ key: string, label: string, count?: number }>} options
 * @param {string} selected
 * @param {(key: string) => void} onChange
 */
export default function FilterChips({
  options = [],
  selected,
  onChange,
  className = '',
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {options.map((opt) => {
        const isSelected = selected === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] border transition-colors cursor-pointer select-none ${
              isSelected
                ? 'bg-ink text-cream border-ink'
                : 'bg-white text-ink border-line/60 hover:border-ink hover:bg-cream'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.2 text-[10px] font-mono ${
                  isSelected ? 'bg-cream/20 text-cream' : 'bg-neutral-100 text-line'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
