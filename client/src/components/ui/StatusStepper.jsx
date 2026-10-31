import React from 'react';

/**
 * Editorial Status Stepper
 * Shows progressive lifecycle steps (e.g., Draft > Quotation > Confirmed > Active > Closed)
 * @param {string[]} steps - Ordered list of step identifiers
 * @param {string} current - Current active step
 * @param {Record<string, string>} labels - Optional mapping of step -> display label
 */
export default function StatusStepper({
  steps = ['draft', 'quotation', 'confirmed', 'active', 'closed'],
  current,
  labels = {},
  className = '',
}) {
  const currentIndex = steps.indexOf(String(current || '').toLowerCase());

  return (
    <div className={`flex items-center overflow-x-auto py-2 ${className}`}>
      {steps.map((step, idx) => {
        const isPast = currentIndex > idx;
        const isCurrent = currentIndex === idx;
        const isFuture = currentIndex < idx;
        const label = labels[step] || step.toUpperCase();

        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`flex items-center justify-center w-6 h-6 text-[10px] font-bold border ${
                  isCurrent
                    ? 'bg-maroon text-white border-maroon'
                    : isPast
                    ? 'bg-ink text-cream border-ink'
                    : 'bg-white text-line border-line/50'
                }`}
              >
                {idx + 1}
              </div>
              <span
                className={`text-[11px] font-bold uppercase tracking-[0.08em] ${
                  isCurrent
                    ? 'text-maroon font-black'
                    : isPast
                    ? 'text-ink'
                    : 'text-line/60'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-px w-6 sm:w-10 mx-2 flex-shrink-0 ${
                  isPast ? 'bg-ink' : 'bg-line/30'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
