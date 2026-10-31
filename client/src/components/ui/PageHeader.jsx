import React from 'react';

/**
 * Editorial PageHeader
 * @param {string} title
 * @param {string} subtitle
 * @param {React.ReactNode} actions
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4 gap-4 ${className}`}
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs uppercase tracking-wider text-line mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
}
