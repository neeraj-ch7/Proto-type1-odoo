import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Editorial Modal
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string} title
 * @param {string} subtitle
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'|'4xl'} maxWidth
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  className = '',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative bg-white border border-ink w-full ${
          maxWidthClasses[maxWidth] || 'max-w-md'
        } p-6 space-y-4 font-sans max-h-[90vh] overflow-y-auto ${className}`}
      >
        <div className="flex justify-between items-start border-b border-ink pb-3">
          <div>
            {title && (
              <h3 className="text-lg font-bold uppercase tracking-tight text-ink">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs uppercase tracking-[0.08em] text-line mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-line hover:text-ink cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
