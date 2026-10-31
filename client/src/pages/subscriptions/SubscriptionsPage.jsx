import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscriptionStatus,
  createFromTemplate,
  getCustomers,
} from '../../api/subscriptions.api';
import { getProducts, getPlans, getTaxes, getTemplates } from '../../api/catalog.api';
import { getInvoices } from '../../api/invoices.api';
import { formatCurrency, formatDate } from '../../utils/format';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
} from 'lucide-react';

const STATUS_STEPS = ['draft', 'quotation', 'confirmed', 'active', 'closed'];

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [subInvoices, setSubInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Reference data for forms
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Form State: New Subscription
  const [formData, setFormData] = useState({
    customer: '',
    plan: '',
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    paymentTerms: 15,
    status: 'draft',
    quotationValidUntil: '',
    notes: '',
    lines: [
      {
        product: '',
        variantValue: '',
        quantity: 1,
        unitPrice: 0,
        tax: '',
        taxRate: 0,
      },
    ],
  });

  // Form State: From Template
  const [templateFormData, setTemplateFormData] = useState({
    templateId: '',
    customer: '',
    startDate: new Date().toISOString().slice(0, 10),
  });

  // Load subscriptions list
  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await getSubscriptions({
        page,
        limit,
        search: search.trim(),
        status: statusFilter,
      });
      setSubscriptions(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  // Load auxiliary reference data
  const loadReferenceData = async () => {
    try {
      const [cRes, pRes, prRes, tRes, tmRes] = await Promise.all([
        getCustomers().catch(() => ({ items: [] })),
        getPlans({ limit: 100, status: 'active' }).catch(() => ({ items: [] })),
        getProducts({ limit: 100, active: true }).catch(() => ({ items: [] })),
        getTaxes({ limit: 100, active: true }).catch(() => ({ items: [] })),
        getTemplates({ limit: 100 }).catch(() => ({ items: [] })),
      ]);
      setCustomers(cRes.items || []);
      setPlans(pRes.items || []);
      setProducts(prRes.items || []);
      setTaxes(tRes.items || []);
      setTemplates(tmRes.items || []);
    } catch (err) {
      console.warn('Error loading form references:', err);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  // Open detail modal and load associated invoices
  const openDetail = async (sub) => {
    try {
      const fullSub = await getSubscription(sub.id || sub._id);
      setSelectedSub(fullSub);
      setDetailModalOpen(true);
      setLoadingInvoices(true);
      const invData = await getInvoices({ subscription: fullSub.id || fullSub._id, limit: 50 });
      setSubInvoices(invData.items || []);
    } catch (err) {
      toast.error('Failed to load subscription details');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Status transition handler
  const handleTransition = async (targetStatus) => {
    if (!selectedSub) return;
    try {
      const updated = await updateSubscriptionStatus(selectedSub.id || selectedSub._id, targetStatus);
      toast.success(`Subscription moved to ${targetStatus.toUpperCase()}`);
      setSelectedSub(updated);
      loadSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transition failed');
    }
  };

  // Line item manipulation in Create Form
  const handleProductChange = (index, productId) => {
    const prod = products.find((p) => p.id === productId || p._id === productId);
    const updatedLines = [...formData.lines];
    if (prod) {
      updatedLines[index].product = productId;
      updatedLines[index].variantValue = '';
      updatedLines[index].unitPrice = Number(prod.salesPrice || 0);
    } else {
      updatedLines[index].product = '';
      updatedLines[index].variantValue = '';
      updatedLines[index].unitPrice = 0;
    }
    setFormData({ ...formData, lines: updatedLines });
  };

  const handleVariantChange = (index, variantValue) => {
    const updatedLines = [...formData.lines];
    const line = updatedLines[index];
    line.variantValue = variantValue;
    const prod = products.find((p) => p.id === line.product || p._id === line.product);
    if (prod) {
      const variant = (prod.variants || []).find((v) => v.value === variantValue);
      const extra = variant ? Number(variant.extraPrice || 0) : 0;
      line.unitPrice = Number(prod.salesPrice || 0) + extra;
    }
    setFormData({ ...formData, lines: updatedLines });
  };

  const handleTaxChange = (index, taxId) => {
    const updatedLines = [...formData.lines];
    const tax = taxes.find((t) => t.id === taxId || t._id === taxId);
    updatedLines[index].tax = taxId;
    updatedLines[index].taxRate = tax ? Number(tax.rate || 0) : 0;
    setFormData({ ...formData, lines: updatedLines });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        { product: '', variantValue: '', quantity: 1, unitPrice: 0, tax: '', taxRate: 0 },
      ],
    });
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 1) {
      toast.error('Subscription must have at least one line item');
      return;
    }
    const updatedLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: updatedLines });
  };

  // Submit standard subscription create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer) {
      toast.error('Please select a customer');
      return;
    }
    if (!formData.plan) {
      toast.error('Please select a plan');
      return;
    }
    const invalidLine = formData.lines.find((l) => !l.product);
    if (invalidLine) {
      toast.error('Please select a product for all lines');
      return;
    }

    try {
      await createSubscription(formData);
      toast.success('Subscription created successfully');
      setCreateModalOpen(false);
      loadSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create subscription');
    }
  };

  // Submit create from template
  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!templateFormData.templateId) {
      toast.error('Please select a quotation template');
      return;
    }
    if (!templateFormData.customer) {
      toast.error('Please select a customer');
      return;
    }

    try {
      await createFromTemplate(templateFormData.templateId, {
        customer: templateFormData.customer,
        startDate: templateFormData.startDate,
      });
      toast.success('Subscription created from template');
      setTemplateModalOpen(false);
      loadSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create from template');
    }
  };

  // Render Status Badge
  const renderBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'active':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-ink text-cream">
            ACTIVE
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] border border-ink text-ink">
            CONFIRMED
          </span>
        );
      case 'quotation':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-cream border border-line text-ink">
            QUOTATION
          </span>
        );
      case 'draft':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] border border-dashed border-ink text-ink">
            DRAFT
          </span>
        );
      case 'closed':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] border border-line text-line">
            CLOSED
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-ink pb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-ink">
            Subscriptions
          </h1>
          <p className="text-xs uppercase tracking-[0.08em] text-line mt-1">
            Lifecycle Management: Draft &gt; Quotation &gt; Confirmed &gt; Active &gt; Closed
          </p>
        </div>

        {isAdminOrStaff && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="px-4 py-2 border border-ink text-xs font-bold uppercase tracking-[0.08em] hover:bg-cream transition-colors flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5" />
              From Template
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon transition-colors flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              New Subscription
            </button>
          </div>
        )}
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {['', 'draft', 'quotation', 'confirmed', 'active', 'closed'].map((st) => (
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

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-line" />
          <input
            type="text"
            placeholder="SEARCH NUMBER, NOTES, CUSTOMER..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-white border border-ink text-xs uppercase tracking-[0.08em] focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white border border-ink overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-ink bg-cream text-[11px] font-bold uppercase tracking-[0.08em] text-line">
              <th className="py-3 px-4">Number</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Start Date</th>
              <th className="py-3 px-4">Next Invoice</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs uppercase tracking-wider text-line">
                  Loading subscriptions...
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs uppercase tracking-wider text-line">
                  No subscriptions found matching the filter criteria.
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => {
                const customerName = sub.customer?.name || sub.customer?.email || '—';
                const planName = sub.plan?.name || '—';
                return (
                  <tr key={sub.id || sub._id} className="hover:bg-cream/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-ink font-mono">
                      {sub.number}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-semibold text-ink uppercase">{customerName}</div>
                      {sub.customer?.email && (
                        <div className="text-[10px] text-line lowercase">{sub.customer.email}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-ink uppercase">
                      {planName}
                    </td>
                    <td className="py-3 px-4 text-xs text-line">
                      {formatDate(sub.startDate)}
                    </td>
                    <td className="py-3 px-4 text-xs text-ink font-medium">
                      {sub.nextInvoiceDate ? formatDate(sub.nextInvoiceDate) : '—'}
                    </td>
                    <td className="py-3 px-4">{renderBadge(sub.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openDetail(sub)}
                        className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] border border-ink text-ink hover:bg-ink hover:text-cream transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
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
          Showing {subscriptions.length} of {total} subscriptions
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

      {/* DETAIL & LIFECYCLE MODAL */}
      {detailModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-ink w-full max-w-4xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-ink pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold uppercase tracking-tight text-ink font-mono">
                    {selectedSub.number}
                  </h2>
                  {renderBadge(selectedSub.status)}
                </div>
                <p className="text-xs uppercase tracking-[0.08em] text-line mt-1">
                  Plan: {selectedSub.plan?.name || 'Standard Plan'} | Customer: {selectedSub.customer?.name || selectedSub.customer?.email || 'Customer'}
                </p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 text-line hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STATUS STEPPER */}
            <div className="bg-cream border border-ink p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-line mb-3">
                Subscription Lifecycle Stepper
              </h4>
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const currentIdx = STATUS_STEPS.indexOf(selectedSub.status);
                  const isDone = currentIdx > idx;
                  const isCurrent = currentIdx === idx;
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center relative">
                      <div
                        className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold uppercase ${
                          isCurrent
                            ? 'bg-maroon text-white ring-2 ring-maroon'
                            : isDone
                            ? 'bg-ink text-cream'
                            : 'border border-line text-line bg-white'
                        }`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 ${
                          isCurrent ? 'text-maroon' : isDone ? 'text-ink' : 'text-line'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Allowed Transition Action Buttons */}
            <div className="border border-ink p-4 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="text-xs uppercase tracking-[0.08em] text-line">
                Current Status: <strong className="text-ink">{selectedSub.status.toUpperCase()}</strong>
              </div>
              <div className="flex items-center gap-2">
                {selectedSub.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleTransition('quotation')}
                      className="px-3 py-1.5 border border-ink text-xs font-bold uppercase tracking-[0.08em] hover:bg-cream"
                    >
                      Convert to Quotation
                    </button>
                    <button
                      onClick={() => handleTransition('confirmed')}
                      className="px-3 py-1.5 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon"
                    >
                      Confirm Directly
                    </button>
                  </>
                )}
                {selectedSub.status === 'quotation' && (
                  <button
                    onClick={() => handleTransition('confirmed')}
                    className="px-4 py-1.5 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon"
                  >
                    Confirm Quotation
                  </button>
                )}
                {selectedSub.status === 'confirmed' && (
                  <button
                    onClick={() => handleTransition('active')}
                    className="px-4 py-1.5 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon"
                  >
                    Activate Subscription
                  </button>
                )}
                {selectedSub.status !== 'closed' && (
                  <button
                    onClick={() => handleTransition('closed')}
                    className="px-3 py-1.5 border border-maroon text-maroon text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon hover:text-white"
                  >
                    Cancel / Close Early
                  </button>
                )}
              </div>
            </div>

            {/* Meta Information Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border border-ink p-4 bg-cream/30">
              <div>
                <span className="text-[10px] uppercase font-bold text-line block">Start Date</span>
                <span className="font-semibold text-ink">{formatDate(selectedSub.startDate)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-line block">Expiry Date</span>
                <span className="font-semibold text-ink">{formatDate(selectedSub.expiryDate)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-line block">Next Invoice Date</span>
                <span className="font-semibold text-ink font-mono">{formatDate(selectedSub.nextInvoiceDate)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-line block">Payment Terms</span>
                <span className="font-semibold text-ink">{selectedSub.paymentTerms} Days</span>
              </div>
            </div>

            {/* Lines Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-ink mb-2">
                Subscription Snapshot Lines
              </h4>
              <div className="border border-ink overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-ink bg-cream text-[10px] font-bold uppercase tracking-[0.08em] text-line">
                      <th className="p-2">Description</th>
                      <th className="p-2">Variant</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Unit Price</th>
                      <th className="p-2 text-right">Tax Rate</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(selectedSub.lines || []).map((l, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{l.description || 'Subscription Line'}</td>
                        <td className="p-2 text-line uppercase">{l.variantValue || '—'}</td>
                        <td className="p-2 text-center font-semibold">{l.quantity}</td>
                        <td className="p-2 text-right">{formatCurrency(l.unitPrice)}</td>
                        <td className="p-2 text-right">{l.taxRate ? `${l.taxRate}%` : '0%'}</td>
                        <td className="p-2 text-right font-bold">{formatCurrency(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoices of this subscription */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-ink mb-2">
                Invoices for this Subscription
              </h4>
              <div className="border border-ink overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-ink bg-cream text-[10px] font-bold uppercase tracking-[0.08em] text-line">
                      <th className="p-2">Invoice #</th>
                      <th className="p-2">Period</th>
                      <th className="p-2">Due Date</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Paid</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingInvoices ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-line">Loading invoices...</td>
                      </tr>
                    ) : subInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-line">No invoices generated yet for this subscription.</td>
                      </tr>
                    ) : (
                      subInvoices.map((inv) => (
                        <tr key={inv.id || inv._id}>
                          <td className="p-2 font-mono font-bold text-ink">{inv.number}</td>
                          <td className="p-2 text-line">
                            {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                          </td>
                          <td className="p-2 text-line">{formatDate(inv.dueDate)}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(inv.total)}</td>
                          <td className="p-2 text-right text-line">{formatCurrency(inv.amountPaid)}</td>
                          <td className="p-2 text-center font-bold uppercase text-[10px]">
                            {inv.status}
                          </td>
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

      {/* CREATE SUBSCRIPTION MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white border border-ink w-full max-w-3xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start border-b border-ink pb-4">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight text-ink">
                  Create Subscription
                </h2>
                <p className="text-xs uppercase tracking-[0.08em] text-line mt-1">
                  Enforces plan rules, variant pricing snapshots, and tax rates
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-line hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                  Customer *
                </label>
                <select
                  required
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  className="w-full p-2 border border-ink text-xs uppercase bg-white focus:outline-none"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name ? `${c.name} (${c.email})` : c.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                  Plan *
                </label>
                <select
                  required
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                  className="w-full p-2 border border-ink text-xs uppercase bg-white focus:outline-none"
                >
                  <option value="">Select Plan</option>
                  {plans.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.name} ({p.billingPeriod} - {formatCurrency(p.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full p-2 border border-ink text-xs focus:outline-none"
                >
                </input>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full p-2 border border-ink text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                  Payment Terms (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: Number(e.target.value) })}
                  className="w-full p-2 border border-ink text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                  Initial Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2 border border-ink text-xs uppercase bg-white focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="quotation">Quotation</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>

            {/* Lines Editor */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-ink pb-2">
                <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-ink">
                  Subscription Lines
                </h4>
                <button
                  type="button"
                  onClick={addLine}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] bg-ink text-cream hover:bg-maroon transition-colors"
                >
                  + Add Line
                </button>
              </div>

              {formData.lines.map((line, idx) => {
                const selectedProd = products.find((p) => p.id === line.product || p._id === line.product);
                const prodVariants = selectedProd?.variants || [];
                const lineTotal = line.quantity * line.unitPrice;

                return (
                  <div key={idx} className="p-3 border border-ink bg-cream/40 grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-line mb-1">
                        Product
                      </label>
                      <select
                        required
                        value={line.product}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full p-1.5 border border-ink text-xs uppercase bg-white focus:outline-none"
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id || p._id} value={p.id || p._id}>
                            {p.name} ({formatCurrency(p.salesPrice)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-line mb-1">
                        Variant
                      </label>
                      <select
                        value={line.variantValue}
                        onChange={(e) => handleVariantChange(idx, e.target.value)}
                        disabled={!prodVariants.length}
                        className="w-full p-1.5 border border-ink text-xs uppercase bg-white focus:outline-none disabled:bg-gray-100"
                      >
                        <option value="">Standard</option>
                        {prodVariants.map((v, vIdx) => (
                          <option key={vIdx} value={v.value}>
                            {v.attribute}: {v.value} (+{v.extraPrice})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-line mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => {
                          const updated = [...formData.lines];
                          updated[idx].quantity = Number(e.target.value || 1);
                          setFormData({ ...formData, lines: updated });
                        }}
                        className="w-full p-1.5 border border-ink text-xs text-center focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-line mb-1">
                        Tax
                      </label>
                      <select
                        value={line.tax}
                        onChange={(e) => handleTaxChange(idx, e.target.value)}
                        className="w-full p-1.5 border border-ink text-xs uppercase bg-white focus:outline-none"
                      >
                        <option value="">0% Tax</option>
                        {taxes.map((t) => (
                          <option key={t.id || t._id} value={t.id || t._id}>
                            {t.name} ({t.rate}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-right">
                        <span className="block text-[9px] uppercase text-line">Line Total</span>
                        <span className="font-bold text-xs">{formatCurrency(lineTotal)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="p-1 text-line hover:text-maroon ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                Internal Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ADD OPTIONAL NOTES..."
                className="w-full p-2 border border-ink text-xs focus:outline-none uppercase"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-ink">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 border border-ink text-xs font-bold uppercase tracking-[0.08em] hover:bg-cream"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon transition-colors"
              >
                Create Subscription
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE FROM TEMPLATE MODAL */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleTemplateSubmit}
            className="bg-white border border-ink w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex justify-between items-start border-b border-ink pb-3">
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight text-ink">
                  Create from Template
                </h3>
                <p className="text-xs uppercase tracking-[0.08em] text-line mt-1">
                  Copies plan and preconfigured lines with validity days
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="p-1 text-line hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                Quotation Template *
              </label>
              <select
                required
                value={templateFormData.templateId}
                onChange={(e) => setTemplateFormData({ ...templateFormData, templateId: e.target.value })}
                className="w-full p-2 border border-ink text-xs uppercase bg-white focus:outline-none"
              >
                <option value="">Select Template</option>
                {templates.map((t) => (
                  <option key={t.id || t._id} value={t.id || t._id}>
                    {t.name} ({t.validityDays} Days Validity)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                Customer *
              </label>
              <select
                required
                value={templateFormData.customer}
                onChange={(e) => setTemplateFormData({ ...templateFormData, customer: e.target.value })}
                className="w-full p-2 border border-ink text-xs uppercase bg-white focus:outline-none"
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name ? `${c.name} (${c.email})` : c.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={templateFormData.startDate}
                onChange={(e) => setTemplateFormData({ ...templateFormData, startDate: e.target.value })}
                className="w-full p-2 border border-ink text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-ink">
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="px-4 py-2 border border-ink text-xs font-bold uppercase tracking-[0.08em] hover:bg-cream"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon transition-colors"
              >
                Generate Subscription
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
