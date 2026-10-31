import React, { useState, useEffect, useCallback } from 'react';
import { getPayments } from '../../api/payments.api';
import { getInvoice } from '../../api/invoices.api';
import { formatCurrency, formatDate } from '../../utils/format';
import {
  DataTable,
  Button,
  Modal,
  PageHeader,
} from '../../components/ui';
import InvoiceDocument from '../../components/invoices/InvoiceDocument';
import { Search, RefreshCw, Eye, FileText, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Filters
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Invoice preview
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPayments({
        page,
        limit: 15,
        method: method || undefined,
        search: search.trim() || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setPayments(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load payments history');
    } finally {
      setLoading(false);
    }
  }, [page, method, search, from, to]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleOpenInvoice = async (invoiceId) => {
    if (!invoiceId) return;
    setLoadingInvoice(true);
    try {
      const inv = await getInvoice(invoiceId);
      setPreviewInvoice(inv);
    } catch (err) {
      toast.error('Failed to load invoice details');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const columns = [
    {
      header: 'DATE',
      render: (p) => (
        <span className="font-semibold text-ink">{formatDate(p.date)}</span>
      ),
    },
    {
      header: 'INVOICE',
      render: (p) => {
        const invNum = p.invoice?.number || '—';
        const invId = p.invoice?.id || p.invoiceId;
        return (
          <button
            type="button"
            onClick={() => handleOpenInvoice(invId)}
            className="flex items-center gap-1 font-bold text-ink hover:text-maroon underline uppercase cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            {invNum}
          </button>
        );
      },
    },
    {
      header: 'CUSTOMER',
      render: (p) => (
        <div>
          <div className="font-semibold uppercase text-ink">
            {p.customer?.name || 'Customer'}
          </div>
          <div className="text-[10px] text-line font-mono">
            {p.customer?.email || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'METHOD',
      render: (p) => (
        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-ink bg-white text-ink">
          {p.method ? p.method.replace('_', ' ') : 'OTHER'}
        </span>
      ),
    },
    {
      header: 'AMOUNT',
      align: 'right',
      render: (p) => (
        <span className="font-bold text-ink font-mono text-xs">
          {formatCurrency(p.amount)}
        </span>
      ),
    },
    {
      header: 'RECORDED BY',
      render: (p) => (
        <span className="text-[11px] uppercase text-line font-semibold">
          {p.recordedBy?.name || p.recordedBy?.email || 'Staff'}
        </span>
      ),
    },
    {
      header: 'NOTE',
      render: (p) => (
        <span className="text-[11px] uppercase text-line truncate max-w-xs block">
          {p.note || '—'}
        </span>
      ),
    },
    {
      header: 'ACTIONS',
      align: 'right',
      render: (p) => {
        const invId = p.invoice?.id || p.invoiceId;
        return (
          <button
            type="button"
            onClick={() => handleOpenInvoice(invId)}
            className="p-1 text-line hover:text-ink hover:bg-cream transition-colors"
            title="View Invoice"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="PAYMENTS"
        subtitle="Multi-channel payment settlements recorded against confirmed customer invoices"
        actions={
          <Button
            variant="secondary"
            onClick={fetchPayments}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-ink">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-line absolute left-3 top-3" />
            <input
              type="text"
              placeholder="SEARCH BY INVOICE, CUSTOMER OR NOTE..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-2 text-xs uppercase bg-white border border-ink focus:outline-none focus:border-maroon"
            />
          </div>
        </div>

        <div>
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs uppercase font-bold bg-white border border-ink text-ink focus:outline-none focus:border-maroon"
          >
            <option value="">ALL METHODS</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-line">From:</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1.5 text-xs bg-white border border-ink focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-line">To:</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1.5 text-xs bg-white border border-ink focus:outline-none"
          />
        </div>

        {(method || search || from || to) && (
          <button
            type="button"
            onClick={() => {
              setMethod('');
              setSearch('');
              setFrom('');
              setTo('');
              setPage(1);
            }}
            className="text-[10px] font-bold uppercase text-maroon hover:underline px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        limit={15}
        onPageChange={(p) => setPage(p)}
        emptyMessage="No payment records found"
      />

      {/* Invoice Document Modal */}
      <Modal
        open={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
        maxWidth="4xl"
        title={`INVOICE ${previewInvoice?.number || ''}`}
        subtitle="Referenced invoice settlement record"
      >
        {previewInvoice && (
          <div className="space-y-6">
            <InvoiceDocument invoice={previewInvoice} />
            <div className="flex justify-end gap-3 pt-4 border-t border-ink">
              <Button variant="secondary" onClick={() => window.print()}>
                Print Invoice
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
