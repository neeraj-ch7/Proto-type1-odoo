import React from 'react';

/**
 * Editorial Input component
 * @param {string} label
 * @param {string} error
 * @param {string} helper
 * @param {boolean} fullWidth
 */
export default function Input({
  label,
  error,
  helper,
  fullWidth = true,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`${fullWidth ? 'w-full' : ''} space-y-1 font-sans`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`w-full px-3 py-2 text-xs bg-white border ${
          error ? 'border-maroon focus:border-maroon' : 'border-ink focus:border-maroon'
        } text-ink placeholder:text-line/60 focus:outline-none transition-colors ${className}`}
        {...props}
      />
      {error && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-maroon">
          {error}
        </p>
      )}
      {!error && helper && (
        <p className="text-[11px] text-line uppercase tracking-wider">
          {helper}
        </p>
      )}
    </div>
  );
}
