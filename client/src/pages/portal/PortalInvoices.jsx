import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyInvoices } from '../../api/me.api';
import { formatCurrency, formatDate } from '../../utils/format';
import { DataTable, StatusBadge, Button, FilterChips } from '../../components/ui';
import { FileText, RefreshCw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PortalInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyInvoices({
        page,
        limit: 15,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setInvoices(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load your invoices');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filterOptions = [
    { key: 'all', label: 'ALL' },
    { key: 'confirmed', label: 'OUTSTANDING / CONFIRMED' },
    { key: 'paid', label: 'PAID' },
    { key: 'overdue', label: 'OVERDUE' },
  ];

  const columns = [
    {
      header: 'INVOICE',
      render: (inv) => (
        <div>
          <button
            type="button"
            onClick={() => navigate(`/portal/invoices/${inv.id || inv._id}`)}
            className="font-bold text-ink hover:text-maroon uppercase tracking-wider underline flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            {inv.number}
          </button>
          {inv.subscription?.number && (
            <div className="text-[10px] text-line font-mono">
              SUB: {inv.subscription.number}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'PERIOD',
      render: (inv) => (
        <span className="text-line text-xs font-semibold">
          {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
        </span>
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
      header: 'TOTAL',
      align: 'right',
      render: (inv) => (
        <span className="font-bold font-mono text-ink">
          {formatCurrency(inv.total)}
        </span>
      ),
    },
    {
      header: 'STILL OWED',
      align: 'right',
      render: (inv) => {
        const total = Number(inv.total || 0);
        const amountPaid = Number(inv.amountPaid || 0);
        const stillOwed = Math.max(0, total - amountPaid);
        return (
          <span
            className={`font-bold font-mono ${
              stillOwed > 0 ? 'text-maroon' : 'text-line'
            }`}
          >
            {formatCurrency(stillOwed)}
          </span>
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
        <Button
          variant="secondary"
          onClick={() => navigate(`/portal/invoices/${inv.id || inv._id}`)}
          className="text-[10px] py-1 px-2.5 flex items-center gap-1"
        >
          <Eye className="w-3 h-3" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4 gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-maroon">
            CUSTOMER BILLING
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-ink mt-0.5">
            MY INVOICES & STATEMENTS
          </h1>
          <p className="text-xs uppercase tracking-wider text-line mt-1">
            Review billing statements, settlement history and download invoices
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={fetchInvoices}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center justify-between overflow-x-auto pb-1 sm:pb-0">
        <FilterChips
          options={filterOptions}
          selected={statusFilter}
          onChange={(key) => {
            setStatusFilter(key);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        limit={15}
        onPageChange={(p) => setPage(p)}
        onRowClick={(inv) => navigate(`/portal/invoices/${inv.id || inv._id}`)}
        emptyMessage="No invoice records found for your account"
      />
    </div>
  );
}
