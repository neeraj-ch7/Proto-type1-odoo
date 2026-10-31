import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getInvoices,
  getInvoice,
  confirmInvoice,
  cancelInvoice,
  sendInvoice,
  runBilling,
  getInvoicePayments,
} from '../../api/invoices.api';
import { formatCurrency, formatDate } from '../../utils/format';
import InvoiceDocument from '../../components/invoices/InvoiceDocument';
import RecordPaymentModal from '../../components/payments/RecordPaymentModal';
import toast from 'react-hot-toast';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Printer,
  Send,
  CheckCircle,
  XCircle,
  CreditCard,
  Eye,
  RefreshCw,
} from 'lucide-react';

export default function InvoicesPage({ isPrintView: propIsPrintView = false }) {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';
  const { id: routeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isPrint = propIsPrintView || location.pathname.endsWith('/print');

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Selected Invoice State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingAsOf, setBillingAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [runningBilling, setRunningBilling] = useState(false);
  const [invoicePayments, setInvoicePayments] = useState([]);

  // Load invoices list
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await getInvoices({
        page,
        limit,
        search: search.trim(),
        status: statusFilter,
      });
      setInvoices(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPrint) {
      loadInvoices();
    }
  }, [page, search, statusFilter, isPrint]);

  // Load specific invoice if routeId is provided (or print mode)
  useEffect(() => {
    if (routeId) {
      getInvoice(routeId)
        .then((data) => {
          setSelectedInvoice(data);
          if (!isPrint) setDetailModalOpen(true);
          loadPaymentsForInvoice(data.id || data._id);
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || 'Invoice not found');
        });
    }
  }, [routeId, isPrint]);

  // Load payments for selected invoice
  const loadPaymentsForInvoice = async (invoiceId) => {
    try {
      const res = await getInvoicePayments(invoiceId);
      setInvoicePayments(res.items || (Array.isArray(res) ? res : []));
    } catch (err) {
      setInvoicePayments([]);
    }
  };

  // Open detail view
  const openDetail = async (inv) => {
    try {
      const full = await getInvoice(inv.id || inv._id);
      setSelectedInvoice(full);
      setDetailModalOpen(true);
      loadPaymentsForInvoice(full.id || full._id);
    } catch (err) {
      toast.error('Failed to load invoice details');
    }
  };

  // Run Billing Engine
  const handleRunBilling = async () => {
    setRunningBilling(true);
    try {
      const res = await runBilling({ asOf: billingAsOf ? new Date(billingAsOf).toISOString() : new Date().toISOString() });
      toast.success(
        `Billing run complete: ${res.created} created, ${res.skipped} skipped${
          res.errors?.length ? `, ${res.errors.length} errors` : ''
        }`,
        { duration: 5000 }
      );
      setBillingModalOpen(false);
      loadInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Billing run failed');
    } finally {
      setRunningBilling(false);
    }
  };

  // Confirm Draft Invoice
  const handleConfirm = async () => {
    if (!selectedInvoice) return;
    try {
      const updated = await confirmInvoice(selectedInvoice.id || selectedInvoice._id);
      toast.success(`Invoice ${updated.number} confirmed`);
      setSelectedInvoice(updated);
      loadInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm invoice');
    }
  };

  // Cancel Invoice
  const handleCancel = async () => {
    if (!selectedInvoice) return;
    try {
      const updated = await cancelInvoice(selectedInvoice.id || selectedInvoice._id);
      toast.success(`Invoice ${updated.number} cancelled`);
      setSelectedInvoice(updated);
      loadInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice');
    }
  };

  // Send Invoice to Customer Email
  const handleSend = async () => {
    if (!selectedInvoice) return;
    try {
      const updated = await sendInvoice(selectedInvoice.id || selectedInvoice._id);
      toast.success(`Invoice ${updated.number} sent to customer`);
      setSelectedInvoice(updated);
      loadInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invoice');
    }
  };

  // Print invoice handler
  const handlePrint = (inv) => {
    const invId = inv?.id || inv?._id || selectedInvoice?.id || selectedInvoice?._id;
    if (invId) {
      window.open(`/app/invoices/${invId}/print`, '_blank');
    }
  };

  // Render Status Badge
  const renderBadge = (inv) => {
    const status = (inv.status || 'draft').toLowerCase();
    const isOverdue = inv.isOverdue || (status === 'confirmed' && inv.dueDate && new Date(inv.dueDate) < new Date());

    if (isOverdue) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-maroon text-white">
          OVERDUE
        </span>
      );
    }
    switch (status) {
      case 'paid':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-ink text-cream">
            PAID
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] border border-ink text-ink">
            CONFIRMED
          </span>
        );
      case 'draft':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] border border-dashed border-ink text-ink">
            DRAFT
          </span>
        );
      case 'cancelled':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] border border-line text-line">
            CANCELLED
          </span>
        );
    }
  };

  // DEDICATED PRINT VIEW
  if (isPrint) {
    return (
      <div className="bg-white min-h-screen p-4 md:p-8 font-sans">
        <style>{`
          @media print {
            body { background: white !important; }
            .no-print { display: none !important; }
          }
        `}</style>

        <div className="no-print max-w-4xl mx-auto mb-6 flex justify-between items-center bg-cream border border-ink p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-ink">
            Print Preview Mode
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-ink text-cream text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-maroon"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Invoice
            </button>
            <button
              onClick={() => window.close()}
              className="px-3 py-1.5 border border-ink text-xs font-bold uppercase tracking-wider hover:bg-white"
            >
              Close
            </button>
          </div>
        </div>

        {selectedInvoice ? (
          <InvoiceDocument invoice={selectedInvoice} />
        ) : (
          <div className="text-center py-12 text-xs uppercase text-line tracking-wider">
            Loading printable invoice...
          </div>
        )}
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-ink pb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-ink">
            Invoices
          </h1>
          <p className="text-xs uppercase tracking-[0.08em] text-line mt-1">
            Automated recurring invoices, tax snapshotting, discounts, and payments
          </p>
        </div>

        {isAdminOrStaff && (
          <button
            onClick={() => setBillingModalOpen(true)}
            className="px-4 py-2 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon transition-colors flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            Run Billing
          </button>
        )}
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {['', 'draft', 'confirmed', 'paid', 'overdue', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                statusFilter === st
                  ? 'bg-ink text-cream'
                  : 'border border-line text-ink hover:bg-cream'
              }`}
            >
              {st === '' ? 'ALL' : st}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-line" />
          <input
            type="text"
            placeholder="SEARCH NUMBER, CUSTOMER..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-white border border-ink text-xs uppercase tracking-[0.08em] focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-ink overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-ink bg-cream text-[11px] font-bold uppercase tracking-[0.08em] text-line">
              <th className="py-3 px-4">Number</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-right">Paid</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs uppercase tracking-wider text-line">
                  Loading invoices...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs uppercase tracking-wider text-line">
                  No invoices found matching the criteria.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const customerName = inv.customer?.name || inv.customer?.email || '—';
                return (
                  <tr key={inv.id || inv._id} className="hover:bg-cream/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-ink font-mono">
                      {inv.number}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-semibold text-ink uppercase">{customerName}</div>
                      {inv.customer?.email && (
                        <div className="text-[10px] text-line lowercase">{inv.customer.email}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-line">
                      {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-ink">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-bold text-ink">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-line font-medium">
                      {formatCurrency(inv.amountPaid)}
                    </td>
                    <td className="py-3 px-4">{renderBadge(inv)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(inv)}
                          className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] border border-ink text-ink hover:bg-ink hover:text-cream transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button
                          onClick={() => handlePrint(inv)}
                          className="p-1 hover:text-maroon text-line transition-colors"
                          title="Print Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs uppercase tracking-[0.08em] text-line">
        <div>
          Showing {invoices.length} of {total} invoices
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1 border border-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cream"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1 border border-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cream"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RUN BILLING ENGINE MODAL */}
      {billingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-ink w-full max-w-md p-6 space-y-4 font-sans">
            <div className="flex justify-between items-start border-b border-ink pb-3">
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight text-ink">
                  Trigger Billing Engine
                </h3>
                <p className="text-xs uppercase tracking-[0.08em] text-line mt-1">
                  Processes active subscriptions with nextInvoiceDate &lt;= As Of Date
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBillingModalOpen(false)}
                className="p-1 text-line hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                As Of Date *
              </label>
              <input
                type="date"
                required
                value={billingAsOf}
                onChange={(e) => setBillingAsOf(e.target.value)}
                className="w-full p-2 border border-ink text-xs focus:outline-none"
              />
              <p className="text-[10px] text-line uppercase mt-1">
                Supports catch-up billing for any missed periods up to this date.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-ink">
              <button
                type="button"
                onClick={() => setBillingModalOpen(false)}
                className="px-4 py-2 border border-ink text-xs font-bold uppercase tracking-[0.08em] hover:bg-cream"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={runningBilling}
                onClick={handleRunBilling}
                className="px-4 py-2 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {runningBilling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Run Engine Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE DETAIL MODAL */}
      {detailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-ink w-full max-w-4xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header & Actions Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-ink pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold uppercase tracking-tight text-ink font-mono">
                  {selectedInvoice.number}
                </h2>
                {renderBadge(selectedInvoice)}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedInvoice.status === 'draft' && (
                  <button
                    onClick={handleConfirm}
                    className="px-3 py-1.5 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Confirm
                  </button>
                )}

                {(selectedInvoice.status === 'confirmed' || selectedInvoice.status === 'paid') && (
                  <button
                    onClick={handleSend}
                    className="px-3 py-1.5 border border-ink text-xs font-bold uppercase tracking-[0.08em] hover:bg-cream transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {selectedInvoice.sentAt ? 'Resend' : 'Send'}
                  </button>
                )}

                {selectedInvoice.status === 'confirmed' && Number(selectedInvoice.amountPaid || 0) < Number(selectedInvoice.total || 0) && (
                  <button
                    onClick={() => setPaymentModalOpen(true)}
                    className="px-3 py-1.5 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon transition-colors flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Record Payment
                  </button>
                )}

                {(selectedInvoice.status === 'draft' || selectedInvoice.status === 'confirmed') && Number(selectedInvoice.amountPaid || 0) === 0 && (
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 border border-maroon text-maroon text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                )}

                <button
                  onClick={() => handlePrint(selectedInvoice)}
                  className="px-3 py-1.5 border border-ink text-xs font-bold uppercase tracking-[0.08em] hover:bg-cream transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>

                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="p-1.5 text-line hover:text-ink ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded Invoice Document */}
            <div className="border border-ink">
              <InvoiceDocument invoice={selectedInvoice} />
            </div>

            {/* Payments History for this Invoice */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-ink mb-2">
                Payments History
              </h4>
              <div className="border border-ink overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-ink bg-cream text-[10px] font-bold uppercase tracking-[0.08em] text-line">
                      <th className="p-2">Date</th>
                      <th className="p-2">Method</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoicePayments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-line">
                          No payments recorded against this invoice yet.
                        </td>
                      </tr>
                    ) : (
                      invoicePayments.map((p, idx) => (
                        <tr key={idx}>
                          <td className="p-2">{formatDate(p.date)}</td>
                          <td className="p-2 uppercase font-medium">{p.method}</td>
                          <td className="p-2 font-bold text-ink">{formatCurrency(p.amount)}</td>
                          <td className="p-2 text-line uppercase">{p.note || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-ink">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 border border-ink text-xs font-bold uppercase tracking-[0.08em] hover:bg-cream"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL (FALLBACK / INTEGRATION) */}
      <RecordPaymentModal
        invoice={selectedInvoice}
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSaved={async () => {
          if (selectedInvoice) {
            const reloaded = await getInvoice(selectedInvoice.id || selectedInvoice._id);
            setSelectedInvoice(reloaded);
            loadPaymentsForInvoice(reloaded.id || reloaded._id);
            loadInvoices();
          }
        }}
      />
    </div>
  );
}
