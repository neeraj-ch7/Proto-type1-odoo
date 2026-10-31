import React from 'react';
import { formatCurrency, formatDate } from '../../utils/format';

/**
 * InvoiceDocument (props: { invoice })
 * Standardized, printable invoice presentation used across:
 * - Invoice Detail View
 * - Print View (/app/invoices/:id/print)
 * - Customer Portal (/portal/invoices/:id)
 */
export default function InvoiceDocument({ invoice }) {
  if (!invoice) return null;

  const lines = invoice.lines || [];
  const status = (invoice.status || 'draft').toLowerCase();
  const isOverdue = invoice.isOverdue || (status === 'confirmed' && invoice.dueDate && new Date(invoice.dueDate) < new Date());

  const getStatusBadge = () => {
    if (isOverdue) {
      return (
        <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] bg-maroon text-white">
          OVERDUE
        </span>
      );
    }
    switch (status) {
      case 'paid':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] bg-ink text-cream">
            PAID
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] border border-ink text-ink">
            CONFIRMED
          </span>
        );
      case 'draft':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] border border-dashed border-ink text-ink">
            DRAFT
          </span>
        );
      case 'cancelled':
      default:
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] border border-line text-line">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  const customerName = invoice.customer?.name || 'Customer';
  const customerEmail = invoice.customer?.email || '—';
  const subNumber = invoice.subscription?.number || (typeof invoice.subscription === 'string' ? invoice.subscription : null);
  const amountPaid = Number(invoice.amountPaid || 0);
  const total = Number(invoice.total || 0);
  const balanceDue = Math.max(0, total - amountPaid);

  return (
    <div className="bg-white text-ink border border-ink p-8 md:p-12 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start border-b border-ink pb-8 mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-ink">
            BRIGHTLOOP SOFTWARE
          </h1>
          <p className="text-xs uppercase tracking-[0.08em] text-line mt-1">
            Subscription Management & Invoicing Engine
          </p>
        </div>
        <div className="text-right flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xl md:text-2xl font-bold uppercase tracking-wide">
              {invoice.number}
            </span>
            {getStatusBadge()}
          </div>
          {subNumber && (
            <p className="text-xs uppercase tracking-[0.08em] text-line">
              Sub: <span className="font-semibold text-ink">{subNumber}</span>
            </p>
          )}
        </div>
      </div>

      {/* Meta Grid: Customer & Billing Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-ink pb-8 mb-8">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-2">
            BILLED TO
          </h3>
          <p className="font-bold text-base uppercase text-ink">{customerName}</p>
          <p className="text-sm text-line">{customerEmail}</p>
          {invoice.customer?.id && (
            <p className="text-xs text-line font-mono mt-1">ID: {invoice.customer.id}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
              PERIOD START
            </h4>
            <p className="text-sm font-semibold">{formatDate(invoice.periodStart)}</p>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
              PERIOD END
            </h4>
            <p className="text-sm font-semibold">{formatDate(invoice.periodEnd)}</p>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
              ISSUED DATE
            </h4>
            <p className="text-sm font-semibold">{formatDate(invoice.issuedAt || invoice.createdAt)}</p>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
              DUE DATE
            </h4>
            <p className={`text-sm font-bold ${isOverdue ? 'text-maroon' : 'text-ink'}`}>
              {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Invoice Lines Table */}
      <div className="mb-8 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-ink text-[11px] font-bold uppercase tracking-[0.08em] text-line">
              <th className="py-2 pr-4">Description</th>
              <th className="py-2 px-4 text-center">Qty</th>
              <th className="py-2 px-4 text-right">Unit Price</th>
              <th className="py-2 px-4 text-right">Tax Rate</th>
              <th className="py-2 pl-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs uppercase tracking-wider text-line">
                  No line items found
                </td>
              </tr>
            ) : (
              lines.map((line, idx) => (
                <tr key={idx} className="text-sm">
                  <td className="py-3 pr-4 font-medium text-ink">
                    {line.description || 'Subscription Line Item'}
                  </td>
                  <td className="py-3 px-4 text-center text-ink">{line.quantity}</td>
                  <td className="py-3 px-4 text-right text-ink">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="py-3 px-4 text-right text-line">
                    {line.taxRate ? `${line.taxRate}%` : '0%'}
                  </td>
                  <td className="py-3 pl-4 text-right font-semibold text-ink">
                    {formatCurrency(line.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Financial Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start pt-4 border-t border-ink gap-6">
        <div className="text-xs text-line uppercase tracking-wider max-w-xs">
          <p className="font-semibold text-ink mb-1">PAYMENT INSTRUCTIONS</p>
          <p>Please remit payment before the stated due date. Payments are accepted via UPI, Bank Transfer, Card, or Cash.</p>
        </div>

        <div className="w-full md:w-64 space-y-2 text-sm">
          <div className="flex justify-between py-1 text-line text-xs uppercase tracking-wider">
            <span>Subtotal:</span>
            <span className="font-semibold text-ink">{formatCurrency(invoice.subtotal)}</span>
          </div>

          {Number(invoice.discountAmount || 0) > 0 && (
            <div className="flex justify-between py-1 text-maroon text-xs uppercase tracking-wider">
              <span>Discounts:</span>
              <span className="font-semibold">-{formatCurrency(invoice.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between py-1 text-line text-xs uppercase tracking-wider">
            <span>Taxes:</span>
            <span className="font-semibold text-ink">+{formatCurrency(invoice.taxAmount)}</span>
          </div>

          <div className="flex justify-between py-2 border-t border-b border-ink text-base font-bold uppercase tracking-wide">
            <span>Total:</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>

          <div className="flex justify-between py-1 text-xs uppercase tracking-wider text-line">
            <span>Amount Paid:</span>
            <span className="font-semibold text-ink">{formatCurrency(invoice.amountPaid)}</span>
          </div>

          <div className="flex justify-between py-1 text-xs uppercase tracking-wider font-bold">
            <span className={balanceDue > 0 ? 'text-maroon' : 'text-ink'}>Still Owed:</span>
            <span className={balanceDue > 0 ? 'text-maroon' : 'text-ink'}>
              {formatCurrency(balanceDue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

