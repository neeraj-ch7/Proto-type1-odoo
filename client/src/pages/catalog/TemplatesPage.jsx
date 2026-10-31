import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getPlans,
  getProducts,
} from '../../api/catalog.api';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TemplatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [templates, setTemplates] = useState([]);
  const [plansList, setPlansList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    validityDays: 30,
    plan: '',
    lines: [],
  });

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates({ page, limit, search: search.trim() });
      setTemplates(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadAuxData = async () => {
    try {
      const [pRes, prodRes] = await Promise.all([
        getPlans({ limit: 100 }),
        getProducts({ limit: 100 }),
      ]);
      setPlansList(pRes.items || []);
      setProductsList(prodRes.items || []);
    } catch (e) {}
  };

  useEffect(() => {
    loadTemplates();
  }, [page, search]);

  useEffect(() => {
    loadAuxData();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      validityDays: 30,
      plan: plansList[0]?.id || '',
      lines: productsList[0] ? [{ product: productsList[0].id, variantValue: '', quantity: 1 }] : [],
    });
    setModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditingTemplate(t);
    setFormData({
      name: t.name,
      validityDays: t.validityDays,
      plan: t.planId || t.plan,
      lines: Array.isArray(t.lines) ? [...t.lines] : [],
    });
    setModalOpen(true);
  };

  const addLine = () => {
    if (!productsList.length) {
      toast.error('No products available to add');
      return;
    }
    setFormData({
      ...formData,
      lines: [...formData.lines, { product: productsList[0].id, variantValue: '', quantity: 1 }],
    });
  };

  const updateLine = (index, field, value) => {
    const updated = [...formData.lines];
    updated[index] = { ...updated[index], [field]: field === 'quantity' ? Math.max(1, parseInt(value) || 1) : value };
    setFormData({ ...formData, lines: updated });
  };

  const removeLine = (index) => {
    const updated = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!formData.plan) {
      toast.error('Plan is required');
      return;
    }
    if (!formData.lines.length) {
      toast.error('At least one product line is required');
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
        toast.success('Template updated');
      } else {
        await createTemplate(formData);
        toast.success('Template created');
      }
      setModalOpen(false);
      loadTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteTemplate(id);
      toast.success('Template deleted');
      loadTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  // Helper map for plan names
  const planMap = Object.fromEntries(plansList.map((p) => [p.id, p]));
  const prodMap = Object.fromEntries(productsList.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-ink">
            Quotation Templates
          </h1>
          <p className="text-xs uppercase tracking-wider text-line mt-1">
            Pre-configured subscription templates linking plans, validity windows, and default line items.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-maroonDeep transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Template
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 border border-line">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-line" />
          <input
            type="text"
            placeholder="SEARCH TEMPLATES..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs uppercase tracking-wider bg-cream/40 border border-line focus:outline-none focus:border-maroon"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-line overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-cream/80 text-[11px] font-bold uppercase tracking-wider text-ink">
              <th className="p-3">Template Name</th>
              <th className="p-3">Associated Plan</th>
              <th className="p-3 text-center">Validity (Days)</th>
              <th className="p-3">Configured Line Items</th>
              {isAdmin && <th className="p-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/30 text-xs">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-line uppercase tracking-widest">
                  Loading templates...
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-line uppercase tracking-widest">
                  No quotation templates found.
                </td>
              </tr>
            ) : (
              templates.map((t) => {
                const plan = planMap[t.planId || t.plan];
                return (
                  <tr key={t.id} className="hover:bg-cream/30 transition-colors">
                    <td className="p-3 font-bold text-ink">{t.name}</td>
                    <td className="p-3">
                      {plan ? (
                        <div className="font-semibold">
                          {plan.name}{' '}
                          <span className="text-[10px] font-mono uppercase text-line ml-1">
                            ({plan.billingPeriod} • {formatCurrency(plan.price)})
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-line">{t.planId || t.plan}</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">{t.validityDays}d</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(t.lines || []).map((l, idx) => {
                          const prod = prodMap[l.product];
                          return (
                            <span
                              key={idx}
                              className="text-[10px] uppercase font-mono px-2 py-0.5 border border-line bg-cream/50"
                            >
                              {l.quantity}x {prod ? prod.name : l.product}{' '}
                              {l.variantValue ? `(${l.variantValue})` : ''}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(t)}
                            className="p-1 hover:text-maroon text-line transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
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
                {editingTemplate ? 'Edit Template' : 'Add New Quotation Template'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:text-maroon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Template Name *
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
                    Validity (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.validityDays}
                    onChange={(e) => setFormData({ ...formData, validityDays: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono focus:outline-none focus:border-maroon"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Associated Plan *
                  </label>
                  <select
                    required
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full p-2 bg-white border border-line text-xs uppercase focus:outline-none focus:border-maroon"
                  >
                    <option value="">-- SELECT PLAN --</option>
                    {plansList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name.toUpperCase()} ({p.billingPeriod.toUpperCase()} - {formatCurrency(p.price)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Lines Editor */}
              <div className="border-t border-line pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                    Template Lines ({formData.lines.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addLine}
                    className="flex items-center gap-1 bg-[#1A1614] text-cream px-3 py-1 text-[11px] font-bold uppercase tracking-wider hover:bg-black transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Product Line
                  </button>
                </div>

                {formData.lines.length === 0 ? (
                  <div className="p-4 bg-white/50 border border-line/40 text-center text-xs text-line uppercase tracking-wider">
                    No product lines configured. Add at least one line item.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.lines.map((l, idx) => {
                      const selectedProd = prodMap[l.product];
                      const availableVariants = selectedProd?.variants || [];

                      return (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-line">
                          {/* Product select */}
                          <select
                            value={l.product}
                            onChange={(e) => updateLine(idx, 'product', e.target.value)}
                            className="flex-1 p-1.5 bg-cream/40 border border-line text-xs uppercase"
                          >
                            {productsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name.toUpperCase()} ({formatCurrency(p.salesPrice)})
                              </option>
                            ))}
                          </select>

                          {/* Variant select if product has variants */}
                          {availableVariants.length > 0 ? (
                            <select
                              value={l.variantValue || ''}
                              onChange={(e) => updateLine(idx, 'variantValue', e.target.value)}
                              className="w-36 p-1.5 bg-cream/40 border border-line text-xs uppercase"
                            >
                              <option value="">STANDARD</option>
                              {availableVariants.map((v, vi) => (
                                <option key={vi} value={v.value}>
                                  {v.attribute}: {v.value} (+{v.extraPrice})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="w-36 text-[10px] text-line uppercase italic text-center">
                              No Variants
                            </div>
                          )}

                          {/* Quantity */}
                          <div className="w-20 flex items-center gap-1">
                            <span className="text-[10px] uppercase font-bold text-line">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              value={l.quantity}
                              onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                              className="w-full p-1.5 bg-cream/40 border border-line text-xs font-mono"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="p-1 text-line hover:text-maroon transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
