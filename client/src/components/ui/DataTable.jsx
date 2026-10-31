import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Editorial DataTable
 * Fully responsive: supports server-side pagination, loading skeleton, empty state,
 * and seamless horizontal scrolling on mobile/tablet viewports.
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 20,
  onPageChange,
  onRowClick,
  className = '',
}) {
  return (
    <div className={`border border-ink bg-white font-sans overflow-hidden ${className}`}>
      {/* Scrollable table container */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-full">
          <thead>
            <tr className="border-b border-ink bg-cream/40 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em] text-line">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3 px-3 sm:px-4 whitespace-nowrap ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/20 text-xs">
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <div className="h-4 bg-line/20 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-xs uppercase tracking-widest text-line"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row.id || row._id || rIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-cream/50 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-3 px-3 sm:px-4 text-ink whitespace-nowrap ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render
                        ? col.render(row)
                        : col.accessor
                        ? row[col.accessor]
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 py-3 border-t border-ink bg-white gap-3">
          <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-line text-center sm:text-left">
            Showing <span className="font-bold text-ink">{data.length}</span> of{' '}
            <span className="font-bold text-ink">{total}</span> items (Page{' '}
            <span className="font-bold text-ink">{page}</span> of{' '}
            <span className="font-bold text-ink">{totalPages || 1}</span>)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
              className="flex items-center gap-1 px-3 py-1.5 border border-ink text-[10px] sm:text-[11px] font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cream transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="text-xs font-mono font-bold px-2">{page}</span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
              className="flex items-center gap-1 px-3 py-1.5 border border-ink text-[10px] sm:text-[11px] font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cream transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
