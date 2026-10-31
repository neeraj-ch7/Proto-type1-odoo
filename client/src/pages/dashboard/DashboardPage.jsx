import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { getDashboardSummary, exportDashboardCsv } from '../../api/dashboard.api';
import { getInvoices } from '../../api/invoices.api';
import { formatCurrency, formatDate } from '../../utils/format';
import {
  KpiCard,
  FilterChips,
  DataTable,
  StatusBadge,
  Button,
  Modal,
} from '../../components/ui';
import RecordPaymentModal from '../../components/payments/RecordPaymentModal';
import InvoiceDocument from '../../components/invoices/InvoiceDocument';
import { Download, Users, RefreshCw, Eye, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [period, setPeriod] = useState('month'); // today, week, month, year, custom
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  // Summary state
  const [summary, setSummary] = useState({
    activeSubscriptions: 0,
    revenueCollected: 0,
    stillOwed: 0,
    overdueCount: 0,
    overdueAmount: 0,
    invoicesByStatus: { draft: 0, confirmed: 0, paid: 0, cancelled: 0 },
  });
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Invoices table state
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoices, setInvoices] = useState([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Modals state
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  // Compute date ranges based on period
  const getDateRange = useCallback(() => {
    const now = dayjs();
    switch (period) {
      case 'today':
        return {
          from: now.startOf('day').toISOString(),
          to: now.endOf('day').toISOString(),
        };
      case 'week':
        return {
          from: now.startOf('week').toISOString(),
          to: now.endOf('week').toISOString(),
        };
      case 'month':
        return {
          from: now.startOf('month').toISOString(),
          to: now.endOf('month').toISOString(),
        };
      case 'year':
        return {
          from: now.startOf('year').toISOString(),
          to: now.endOf('year').toISOString(),
        };
      case 'custom':
        return {
          from: customFrom ? dayjs(customFrom).startOf('day').toISOString() : undefined,
          to: customTo ? dayjs(customTo).endOf('day').toISOString() : undefined,
        };
      default:
        return {};
    }
  }, [period, customFrom, customTo]);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const { from, to } = getDateRange();
      const data = await getDashboardSummary({
        from,
        to,
        customer: customerFilter.trim() || undefined,
      });
      setSummary(data);
    } catch (err) {
      toast.error('Failed to load dashboard summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [getDateRange, customerFilter]);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const { from, to } = getDateRange();
      const data = await getInvoices({
        page,
        limit: 10,
        status: statusFilter === 'all' ? undefined : statusFilter,
        customer: customerFilter.trim() || undefined,
        from,
        to,
      });
      setInvoices(data.items || []);
      setTotalInvoices(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoadingInvoices(false);
    }
  }, [page, statusFilter, customerFilter, getDateRange]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle Export CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const { from, to } = getDateRange();
      await exportDashboardCsv({
        from,
        to,
        customer: customerFilter.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      toast.success('Invoices CSV exported successfully');
    } catch (err) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handlePaymentSaved = () => {
    fetchSummary();
    fetchInvoices();
  };

  // Filter chips options
  const filterOptions = [
    { key: 'all', label: 'ALL', count: totalInvoices },
    { key: 'draft', label: 'DRAFT', count: summary.invoicesByStatus?.draft },
    { key: 'confirmed', label: 'CONFIRMED', count: summary.invoicesByStatus?.confirmed },
    { key: 'paid', label: 'PAID', count: summary.invoicesByStatus?.paid },
    { key: 'overdue', label: 'OVERDUE', count: summary.overdueCount },
  ];

  // Invoices table columns
  const columns = [
    {
      header: 'INVOICE',
      render: (inv) => (
        <div>
          <span className="font-bold uppercase tracking-wider text-ink hover:text-maroon">
            {inv.number}
          </span>
          {inv.subscription?.number && (
            <div className="text-[10px] text-line font-mono">
              SUB: {inv.subscription.number}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'CUSTOMER',
      render: (inv) => (
        <div>
          <div className="font-semibold uppercase text-ink">
            {inv.customer?.name || 'Customer'}
          </div>
          <div className="text-[11px] text-line font-mono">
            {inv.customer?.email || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'DUE DATE',
      render: (inv) => (
        <span
          className={`font-semibold ${
            inv.isOverdue ||
            (inv.status === 'confirmed' &&
              inv.dueDate &&
              new Date(inv.dueDate) < new Date())
              ? 'text-maroon font-bold'
              : 'text-ink'
          }`}
        >
          {formatDate(inv.dueDate)}
        </span>
      ),
    },
    {
      header: 'AMOUNT',
      align: 'right',
      render: (inv) => {
        const total = Number(inv.total || 0);
        const amountPaid = Number(inv.amountPaid || 0);
        const stillOwed = Math.max(0, total - amountPaid);
        return (
          <div className="text-right">
            <div className="font-bold text-ink">{formatCurrency(total)}</div>
            {amountPaid > 0 && stillOwed > 0 && (
              <div className="text-[10px] text-line">
                Paid: {formatCurrency(amountPaid)} (Owed: {formatCurrency(stillOwed)})
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'STATUS',
      align: 'center',
      render: (inv) => {
        const isOverdue =
          inv.isOverdue ||
          (inv.status === 'confirmed' &&
            inv.dueDate &&
            new Date(inv.dueDate) < new Date());
        return <StatusBadge status={isOverdue ? 'overdue' : inv.status} />;
      },
    },
    {
      header: 'ACTIONS',
      align: 'right',
      render: (inv) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setPreviewInvoice(inv)}
            className="p-1 text-line hover:text-ink hover:bg-cream border border-transparent hover:border-line/40 transition-colors"
            title="View Invoice Document"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {inv.status === 'confirmed' && (
            <button
              type="button"
              onClick={() => setSelectedInvoiceForPayment(inv)}
              className="px-2 py-1 bg-ink text-cream hover:bg-maroon text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
              title="Record Payment"
            >
              <CreditCard className="w-3 h-3" />
              Pay
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Header: OVERVIEW with period dropdown & export */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-line pb-6 gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-maroon">
            EXECUTIVE DASHBOARD
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-ink mt-0.5">
            OVERVIEW
          </h1>
          <p className="text-xs uppercase tracking-wider text-line mt-1">
            Real-time billing, revenue performance & collection monitoring
          </p>
        </div>

        {/* Controls: Period dropdown, customer filter, Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-line">
              Period:
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 text-xs font-bold uppercase bg-white border border-ink text-ink focus:outline-none focus:border-maroon"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-ink px-2 py-1">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs focus:outline-none"
              />
              <span className="text-xs text-line font-bold">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs focus:outline-none"
              />
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder="FILTER CUSTOMER ID / NAME"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-3 py-2 text-xs uppercase bg-white border border-ink text-ink placeholder:text-line/60 focus:outline-none focus:border-maroon w-48 sm:w-56"
            />
          </div>

          <Button
            variant="secondary"
            onClick={fetchSummary}
            className="flex items-center gap-1.5"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="primary"
            onClick={handleExport}
            loading={exporting}
            className="flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT
          </Button>
        </div>
      </div>

      {/* Four KpiCards in Order per Contract:
          1. ACTIVE SUBSCRIPTIONS (maroon)
          2. REVENUE COLLECTED (maroonDeep)
          3. STILL OWED (ink)
          4. OVERDUE INVOICES (outlined, maroon number) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="ACTIVE SUBSCRIPTIONS"
          value={loadingSummary ? '...' : summary.activeSubscriptions.toLocaleString('en-IN')}
          subtitle="Currently active customer recurring accounts"
          variant="maroon"
        />

        <KpiCard
          label="REVENUE COLLECTED"
          value={loadingSummary ? '...' : formatCurrency(summary.revenueCollected)}
          subtitle="Total settlements collected in range"
          variant="maroonDeep"
        />

        <KpiCard
          label="STILL OWED"
          value={loadingSummary ? '...' : formatCurrency(summary.stillOwed)}
          subtitle="Unsettled balance on confirmed invoices"
          variant="ink"
        />

        <KpiCard
          label="OVERDUE INVOICES"
          value={loadingSummary ? '...' : summary.overdueCount}
          subtitle={
            summary.overdueAmount > 0
              ? `Amount: ${formatCurrency(summary.overdueAmount)}`
              : 'Zero overdue outstanding'
          }
          variant="outlined"
        />
      </div>

      {/* Invoice Status Summary Chips / Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-ink/40 pb-3 gap-3">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-ink">
              INVOICES & SETTLEMENTS
            </h2>
            <p className="text-[11px] uppercase tracking-wider text-line">
              Filter invoices by lifecycle state or open customer records
            </p>
          </div>

          {/* Filter Chips: ALL / DRAFT / CONFIRMED / PAID / OVERDUE */}
          <FilterChips
            options={filterOptions}
            selected={statusFilter}
            onChange={(key) => {
              setStatusFilter(key);
              setPage(1);
            }}
          />
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={invoices}
          loading={loadingInvoices}
          page={page}
          totalPages={totalPages}
          total={totalInvoices}
          limit={10}
          onPageChange={(p) => setPage(p)}
          onRowClick={(row) => setPreviewInvoice(row)}
          emptyMessage="No invoices found matching current criteria"
        />
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        invoice={selectedInvoiceForPayment}
        open={Boolean(selectedInvoiceForPayment)}
        onClose={() => setSelectedInvoiceForPayment(null)}
        onSaved={handlePaymentSaved}
      />

      {/* Invoice Document Preview Modal */}
      <Modal
        open={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
        maxWidth="4xl"
        title={`INVOICE ${previewInvoice?.number || ''}`}
        subtitle="Standardized printable customer invoice document"
      >
        {previewInvoice && (
          <div className="space-y-6">
            <InvoiceDocument invoice={previewInvoice} />
            <div className="flex justify-between items-center pt-4 border-t border-ink">
              <span className="text-xs uppercase text-line font-mono">
                ID: {previewInvoice.id || previewInvoice._id}
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => window.print()}
                >
                  Print Document
                </Button>
                {previewInvoice.status === 'confirmed' && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setSelectedInvoiceForPayment(previewInvoice);
                      setPreviewInvoice(null);
                    }}
                  >
                    Record Payment
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
