import React from 'react';

/**
 * Editorial Select component
 * @param {string} label
 * @param {string} error
 * @param {Array<{ value: string|number, label: string }>} options
 */
export default function Select({
  label,
  error,
  helper,
  options = [],
  children,
  fullWidth = true,
  className = '',
  id,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`${fullWidth ? 'w-full' : ''} space-y-1 font-sans`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2 text-xs uppercase bg-white border ${
          error ? 'border-maroon focus:border-maroon' : 'border-ink focus:border-maroon'
        } text-ink focus:outline-none transition-colors ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      {error && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-maroon">
          {error}
        </p>
      )}
      {!error && helper && (
        <p className="text-[11px] text-line uppercase tracking-wider">{helper}</p>
      )}
    </div>
  );
}
