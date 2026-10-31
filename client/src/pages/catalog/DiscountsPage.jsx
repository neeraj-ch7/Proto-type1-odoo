import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getProducts,
} from '../../api/catalog.api';
import { formatCurrency, formatDate } from '../../utils/format';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DiscountsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [discounts, setDiscounts] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [appliesToFilter, setAppliesToFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'percent',
    value: 10,
    minPurchase: 0,
    minQty: 0,
    startDate: '',
    endDate: '',
    usageLimit: '',
    appliesTo: 'subscription',
    products: [],
    active: true,
  });

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const data = await getDiscounts({
        page,
        limit,
        search: search.trim(),
        appliesTo: appliesToFilter,
      });
      setDiscounts(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts({ limit: 100 });
      setProductsList(data.items || []);
    } catch (e) {}
  };

  useEffect(() => {
    loadDiscounts();
  }, [page, search, appliesToFilter]);

  useEffect(() => {
    loadProducts();
  }, []);

  const openCreateModal = () => {
    setEditingDiscount(null);
    setFormData({
      name: '',
      type: 'percent',
      value: 10,
      minPurchase: 0,
      minQty: 0,
      startDate: '',
      endDate: '',
      usageLimit: '',
      appliesTo: 'subscription',
      products: [],
      active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (d) => {
    setEditingDiscount(d);
    setFormData({
      name: d.name,
      type: d.type,
      value: d.value,
      minPurchase: d.minPurchase || 0,
      minQty: d.minQty || 0,
      startDate: d.startDate ? d.startDate.slice(0, 10) : '',
      endDate: d.endDate ? d.endDate.slice(0, 10) : '',
      usageLimit: d.usageLimit !== null && d.usageLimit !== undefined ? d.usageLimit : '',
      appliesTo: d.appliesTo || 'subscription',
      products: Array.isArray(d.products) ? [...d.products] : [],
      active: d.active,
    });
    setModalOpen(true);
  };

  const toggleProductSelect = (productId) => {
    const current = formData.products || [];
    if (current.includes(productId)) {
      setFormData({ ...formData, products: current.filter((id) => id !== productId) });
    } else {
      setFormData({ ...formData, products: [...current, productId] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Discount name is required');
      return;
    }
    if (formData.type === 'percent' && formData.value > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }
    if (formData.appliesTo === 'product' && (!formData.products || !formData.products.length)) {
      toast.error('Please select at least one product for product-scoped discount');
      return;
    }

    const payload = {
      ...formData,
      usageLimit: formData.usageLimit === '' ? null : Number(formData.usageLimit),
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
    };

    try {
      if (editingDiscount) {
        await updateDiscount(editingDiscount.id, payload);
        toast.success('Discount updated');
      } else {
        await createDiscount(payload);
        toast.success('Discount created');
      }
      setModalOpen(false);
      loadDiscounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this discount?')) return;
    try {
      await deleteDiscount(id);
      toast.success('Discount deleted');
      loadDiscounts();
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
            Discount Engine
          </h1>
          <p className="text-xs uppercase tracking-wider text-line mt-1">
            Product-scoped line reductions and subscription-scoped prorated discounts with atomic usage caps.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-maroonDeep transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Discount
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 border border-line">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-line" />
          <input
            type="text"
            placeholder="SEARCH DISCOUNTS..."
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
            value={appliesToFilter}
            onChange={(e) => {
              setAppliesToFilter(e.target.value);
              setPage(1);
            }}
            className="w-full p-2 text-xs uppercase tracking-wider bg-cream/40 border border-line focus:outline-none focus:border-maroon"
          >
            <option value="">ALL SCOPES</option>
            <option value="subscription">SUBSCRIPTION-WIDE</option>
            <option value="product">PRODUCT-SCOPED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-line overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-cream/80 text-[11px] font-bold uppercase tracking-wider text-ink">
              <th className="p-3">Discount Name</th>
              <th className="p-3">Type & Value</th>
              <th className="p-3">Scope</th>
              <th className="p-3 text-center">Used / Limit</th>
              <th className="p-3">Thresholds</th>
              <th className="p-3">Validity</th>
              <th className="p-3 text-center">Status</th>
              {isAdmin && <th className="p-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/30 text-xs">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-line uppercase tracking-widest">
                  Loading discounts...
                </td>
              </tr>
            ) : discounts.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-line uppercase tracking-widest">
                  No discounts configured.
                </td>
              </tr>
            ) : (
              discounts.map((d) => {
                const limitReached = d.usageLimit !== null && d.timesUsed >= d.usageLimit;
                return (
                  <tr key={d.id} className="hover:bg-cream/30 transition-colors">
                    <td className="p-3 font-bold text-ink">{d.name}</td>
                    <td className="p-3 font-mono font-bold text-maroon">
                      {d.type === 'percent' ? `${d.value}%` : formatCurrency(d.value)}
                      <span className="text-[10px] text-line uppercase ml-1 font-normal">
                        ({d.type})
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-[11px] uppercase font-mono px-2 py-0.5 border border-line bg-cream/50">
                        {d.appliesTo === 'product' ? `Product (${d.products?.length || 0})` : 'Subscription'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className={limitReached ? 'text-maroon font-bold' : 'text-ink'}>
                        {d.timesUsed} / {d.usageLimit !== null ? d.usageLimit : '∞'}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] font-mono text-line">
                      Min: {formatCurrency(d.minPurchase || 0)} / {d.minQty || 0} qty
                    </td>
                    <td className="p-3 text-[11px] font-mono text-line">
                      {formatDate(d.startDate)} → {formatDate(d.endDate)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={d.active && !limitReached ? 'badge-confirmed' : 'badge-draft'}>
                        {limitReached ? 'LIMIT EXHAUSTED' : d.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(d)}
                            className="p-1 hover:text-maroon text-line transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="p-1 hover:text-maroon text-line transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
          <div className="bg-cream border border-line w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-lg font-black uppercase tracking-tight text-ink">
                {editingDiscount ? 'Edit Discount' : 'Add New Discount'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:text-maroon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Discount Name *
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
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2 bg-white border border-line text-xs uppercase focus:outline-none focus:border-maroon"
                  >
                    <option value="percent">PERCENT (%)</option>
                    <option value="fixed">FIXED AMOUNT (INR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Value ({formData.type === 'percent' ? '%' : 'INR'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.type === 'percent' ? '100' : undefined}
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono focus:outline-none focus:border-maroon"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Applies To (Scope) *
                  </label>
                  <select
                    value={formData.appliesTo}
                    onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value })}
                    className="w-full p-2 bg-white border border-line text-xs uppercase focus:outline-none focus:border-maroon"
                  >
                    <option value="subscription">SUBSCRIPTION (PRORATED ACROSS LINES)</option>
                    <option value="product">PRODUCT-SCOPED (MATCHING LINES ONLY)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Min Purchase (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minPurchase}
                    onChange={(e) => setFormData({ ...formData, minPurchase: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minQty}
                    onChange={(e) => setFormData({ ...formData, minQty: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono"
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
                    className="w-full p-2 bg-white border border-line text-xs font-mono"
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
                    className="w-full p-2 bg-white border border-line text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Usage Limit (Leave empty for unlimited)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono"
                  />
                </div>
              </div>

              {/* Product selector if product-scoped */}
              {formData.appliesTo === 'product' && (
                <div className="border border-line p-3 bg-white space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink">
                    Select Eligible Products ({formData.products.length} selected) *
                  </label>
                  <div className="max-h-40 overflow-y-auto divide-y divide-line/20">
                    {productsList.length === 0 ? (
                      <div className="text-xs text-line p-2">No products available.</div>
                    ) : (
                      productsList.map((p) => {
                        const isSelected = formData.products.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => toggleProductSelect(p.id)}
                            className={`p-2 flex items-center justify-between cursor-pointer text-xs uppercase ${
                              isSelected ? 'bg-maroon/10 font-bold text-maroon' : 'hover:bg-cream/40'
                            }`}
                          >
                            <span>{p.name}</span>
                            <span className="font-mono text-[11px]">{formatCurrency(p.salesPrice)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeDisc"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 accent-maroon"
                />
                <label htmlFor="activeDisc" className="text-xs font-bold uppercase tracking-wider text-ink">
                  Active
                </label>
              </div>

              <div className="border-t border-line pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-line text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-maroon text-white text-xs font-bold uppercase tracking-wider hover:bg-maroonDeep"
                >
                  Save Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
