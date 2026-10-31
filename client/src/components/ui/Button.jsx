import React from 'react';

/**
 * Editorial Button component
 * @param {'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'} variant
 * @param {boolean} fullWidth
 * @param {boolean} disabled
 * @param {boolean} loading
 */
export default function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-bold uppercase tracking-[0.08em] text-xs px-4 py-2.5 transition-colors border select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-ink text-cream border-ink hover:bg-maroon hover:border-maroon active:bg-maroonDeep',
    secondary: 'bg-white text-ink border-ink hover:bg-cream active:bg-neutral-200',
    maroon: 'bg-maroon text-cream border-maroon hover:bg-maroonDeep active:bg-black',
    danger: 'bg-maroon text-white border-maroon hover:bg-maroonDeep',
    outline: 'bg-transparent text-ink border-ink hover:bg-ink hover:text-cream',
    ghost: 'bg-transparent text-ink border-transparent hover:bg-black/5',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${widthStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
