import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getPlans,
  createPlan,
  updatePlan,
  updatePlanStatus,
  deletePlan,
} from '../../api/catalog.api';
import { formatCurrency, formatDate } from '../../utils/format';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Edit2, X, ChevronLeft, ChevronRight, Play, Pause, XCircle, RotateCcw } from 'lucide-react';

export default function PlansPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [renewPlan, setRenewPlan] = useState(null);
  const [renewEndDate, setRenewEndDate] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: 999,
    billingPeriod: 'monthly',
    minQty: 1,
    startDate: '',
    endDate: '',
    autoClose: false,
    closable: true,
    pausable: true,
    renewable: true,
    status: 'active',
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await getPlans({
        page,
        limit,
        search: search.trim(),
        status: statusFilter,
      });
      setPlans(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [page, search, statusFilter]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: 999,
      billingPeriod: 'monthly',
      minQty: 1,
      startDate: '',
      endDate: '',
      autoClose: false,
      closable: true,
      pausable: true,
      renewable: true,
      status: 'active',
    });
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingPlan(p);
    setFormData({
      name: p.name,
      price: p.price,
      billingPeriod: p.billingPeriod,
      minQty: p.minQty || 1,
      startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
      autoClose: Boolean(p.autoClose),
      closable: Boolean(p.closable),
      pausable: Boolean(p.pausable),
      renewable: Boolean(p.renewable),
      status: p.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    const payload = {
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
    };
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, payload);
        toast.success('Plan updated');
      } else {
        await createPlan(payload);
        toast.success('Plan created');
      }
      setModalOpen(false);
      loadPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleStatusAction = async (planId, action, endDate) => {
    try {
      await updatePlanStatus(planId, action, endDate);
      toast.success(`Plan ${action}d successfully`);
      loadPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} plan`);
    }
  };

  const openRenewDialog = (plan) => {
    setRenewPlan(plan);
    setRenewEndDate(new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10));
    setRenewModalOpen(true);
  };

  const submitRenew = async (e) => {
    e.preventDefault();
    if (!renewPlan) return;
    await handleStatusAction(renewPlan.id, 'renew', new Date(renewEndDate).toISOString());
    setRenewModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      await deletePlan(id);
      toast.success('Plan deleted');
      loadPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-ink">
            Subscription Plans
          </h1>
          <p className="text-xs uppercase tracking-wider text-line mt-1">
            Configure recurring tiers, lifecycle rules, auto-close behavior and renewal policies.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-maroonDeep transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Plan
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 border border-line">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-line" />
          <input
            type="text"
            placeholder="SEARCH PLANS..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs uppercase tracking-wider bg-cream/40 border border-line focus:outline-none focus:border-maroon"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full p-2 text-xs uppercase tracking-wider bg-cream/40 border border-line focus:outline-none focus:border-maroon"
          >
            <option value="">ALL STATUSES</option>
            <option value="active">ACTIVE</option>
            <option value="paused">PAUSED</option>
            <option value="closed">CLOSED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-line overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-cream/80 text-[11px] font-bold uppercase tracking-wider text-ink">
              <th className="p-3">Plan Name</th>
              <th className="p-3">Period</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3 text-center">Min Qty</th>
              <th className="p-3">Validity Window</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3">Lifecycle Toggles</th>
              {isAdmin && <th className="p-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/30 text-xs">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-line uppercase tracking-widest">
                  Loading plans...
                </td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-line uppercase tracking-widest">
                  No plans found.
                </td>
              </tr>
            ) : (
              plans.map((p) => {
                const canClose = p.closable && p.status !== 'closed';
                const canPause = p.pausable && p.status === 'active';
                const canResume = p.status === 'paused';
                const canRenew = p.renewable;

                return (
                  <tr key={p.id} className="hover:bg-cream/30 transition-colors">
                    <td className="p-3 font-bold text-ink">{p.name}</td>
                    <td className="p-3 uppercase text-[11px] font-mono text-line">{p.billingPeriod}</td>
                    <td className="p-3 text-right font-mono font-bold text-ink">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="p-3 text-center font-mono">{p.minQty}</td>
                    <td className="p-3 text-[11px] font-mono text-line">
                      {formatDate(p.startDate)} → {formatDate(p.endDate)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={
                          p.status === 'active'
                            ? 'badge-confirmed'
                            : p.status === 'paused'
                            ? 'badge-paused'
                            : 'badge-closed'
                        }
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 text-[9px] uppercase font-mono">
                        <span className={`px-1 py-0.5 border ${p.closable ? 'border-line text-ink' : 'border-line/30 text-line/50'}`}>
                          {p.closable ? 'CLOSABLE' : 'NO-CLOSE'}
                        </span>
                        <span className={`px-1 py-0.5 border ${p.pausable ? 'border-line text-ink' : 'border-line/30 text-line/50'}`}>
                          {p.pausable ? 'PAUSABLE' : 'NO-PAUSE'}
                        </span>
                        <span className={`px-1 py-0.5 border ${p.renewable ? 'border-line text-ink' : 'border-line/30 text-line/50'}`}>
                          {p.renewable ? 'RENEWABLE' : 'NO-RENEW'}
                        </span>
                        {p.autoClose && (
                          <span className="px-1 py-0.5 border border-maroon text-maroon font-bold">
                            AUTO-CLOSE
                          </span>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Row actions per contract */}
                          {canResume && (
                            <button
                              onClick={() => handleStatusAction(p.id, 'resume')}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black text-white hover:bg-maroon transition-colors"
                              title="Resume Plan"
                            >
                              Resume
                            </button>
                          )}
                          {canPause && (
                            <button
                              onClick={() => handleStatusAction(p.id, 'pause')}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-line text-ink hover:bg-white"
                              title="Pause Plan"
                            >
                              Pause
                            </button>
                          )}
                          {canClose && (
                            <button
                              onClick={() => handleStatusAction(p.id, 'close')}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-maroon text-maroon hover:bg-maroon hover:text-white"
                              title="Close Plan"
                            >
                              Close
                            </button>
                          )}
                          {canRenew && (
                            <button
                              onClick={() => openRenewDialog(p)}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-line text-ink hover:bg-cream"
                              title="Renew Plan"
                            >
                              Renew
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1 hover:text-maroon text-line transition-colors ml-1"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1 hover:text-maroon text-line transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-line">
        <div>Total: {total} items</div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="p-1.5 border border-line disabled:opacity-30 hover:bg-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="p-1.5 border border-line disabled:opacity-30 hover:bg-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Plan Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
          <div className="bg-cream border border-line w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-lg font-black uppercase tracking-tight text-ink">
                {editingPlan ? 'Edit Plan' : 'Add New Plan'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:text-maroon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 bg-white border border-line text-xs uppercase focus:outline-none focus:border-maroon"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Billing Period *
                  </label>
                  <select
                    value={formData.billingPeriod}
                    onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value })}
                    className="w-full p-2 bg-white border border-line text-xs uppercase focus:outline-none focus:border-maroon"
                  >
                    <option value="daily">DAILY</option>
                    <option value="weekly">WEEKLY</option>
                    <option value="monthly">MONTHLY</option>
                    <option value="yearly">YEARLY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Price (INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono focus:outline-none focus:border-maroon"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Min Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.minQty}
                    onChange={(e) => setFormData({ ...formData, minQty: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono focus:outline-none focus:border-maroon"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono focus:outline-none focus:border-maroon"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono focus:outline-none focus:border-maroon"
                  />
                </div>
              </div>

              {/* Lifecycle flags */}
              <div className="border-t border-line pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Lifecycle Controls
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-line">
                    <input
                      type="checkbox"
                      checked={formData.closable}
                      onChange={(e) => setFormData({ ...formData, closable: e.target.checked })}
                      className="w-4 h-4 accent-maroon"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                      Closable (Can close plan early)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-line">
                    <input
                      type="checkbox"
                      checked={formData.pausable}
                      onChange={(e) => setFormData({ ...formData, pausable: e.target.checked })}
                      className="w-4 h-4 accent-maroon"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                      Pausable (Can pause subscriptions)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-line">
                    <input
                      type="checkbox"
                      checked={formData.renewable}
                      onChange={(e) => setFormData({ ...formData, renewable: e.target.checked })}
                      className="w-4 h-4 accent-maroon"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                      Renewable (Can renew expired plan)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-line">
                    <input
                      type="checkbox"
                      checked={formData.autoClose}
                      onChange={(e) => setFormData({ ...formData, autoClose: e.target.checked })}
                      className="w-4 h-4 accent-maroon"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                      Auto-Close (Close when end date passed)
                    </span>
                  </label>
                </div>
              </div>

              <div className="border-t border-line pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-line text-xs font-bold uppercase tracking-wider hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-maroon text-white text-xs font-bold uppercase tracking-wider hover:bg-maroonDeep"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {renewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
          <div className="bg-cream border border-line w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-black uppercase tracking-tight text-ink">
                Renew Plan: {renewPlan?.name}
              </h3>
              <button onClick={() => setRenewModalOpen(false)} className="p-1 hover:text-maroon">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitRenew} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                  New End Date *
                </label>
                <input
                  type="date"
                  required
                  value={renewEndDate}
                  onChange={(e) => setRenewEndDate(e.target.value)}
                  className="w-full p-2 bg-white border border-line text-xs font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenewModalOpen(false)}
                  className="px-3 py-1.5 border border-line text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-maroon text-white text-xs font-bold uppercase tracking-wider"
                >
                  Confirm Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
