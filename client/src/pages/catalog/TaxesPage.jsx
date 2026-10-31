import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTaxes, createTax, updateTax, deleteTax } from '../../api/catalog.api';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TaxesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    rate: 18,
    active: true,
  });

  const loadTaxes = async () => {
    setLoading(true);
    try {
      const data = await getTaxes({ page, limit, search: search.trim() });
      setTaxes(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load taxes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxes();
  }, [page, search]);

  const openCreateModal = () => {
    setEditingTax(null);
    setFormData({ name: '', rate: 18, active: true });
    setModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditingTax(t);
    setFormData({ name: t.name, rate: t.rate, active: t.active });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Tax name is required');
      return;
    }
    try {
      if (editingTax) {
        await updateTax(editingTax.id, formData);
        toast.success('Tax rate updated');
      } else {
        await createTax(formData);
        toast.success('Tax rate created');
      }
      setModalOpen(false);
      loadTaxes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tax rate?')) return;
    try {
      await deleteTax(id);
      toast.success('Tax deleted');
      loadTaxes();
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
            Tax Rates
          </h1>
          <p className="text-xs uppercase tracking-wider text-line mt-1">
            Configure statutory tax rates applied line-by-line after discount calculation.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-maroonDeep transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Tax
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 border border-line">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-line" />
          <input
            type="text"
            placeholder="SEARCH TAX RATES..."
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
              <th className="p-3">Tax Name</th>
              <th className="p-3 text-right">Rate (%)</th>
              <th className="p-3 text-center">Status</th>
              {isAdmin && <th className="p-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/30 text-xs">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-line uppercase tracking-widest">
                  Loading taxes...
                </td>
              </tr>
            ) : taxes.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-line uppercase tracking-widest">
                  No tax rates configured.
                </td>
              </tr>
            ) : (
              taxes.map((t) => (
                <tr key={t.id} className="hover:bg-cream/30 transition-colors">
                  <td className="p-3 font-bold text-ink">{t.name}</td>
                  <td className="p-3 text-right font-mono font-bold text-ink">{t.rate}%</td>
                  <td className="p-3 text-center">
                    <span className={t.active ? 'badge-confirmed' : 'badge-draft'}>
                      {t.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
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
              ))
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
          <div className="bg-cream border border-line w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-lg font-black uppercase tracking-tight text-ink">
                {editingTax ? 'Edit Tax Rate' : 'Add Tax Rate'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:text-maroon">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                  Tax Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GST 18% or VAT 5%"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 bg-white border border-line text-xs uppercase focus:outline-none focus:border-maroon"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                  Rate Percentage (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                  className="w-full p-2 bg-white border border-line text-xs font-mono focus:outline-none focus:border-maroon"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activeTax"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 accent-maroon"
                />
                <label htmlFor="activeTax" className="text-xs font-bold uppercase tracking-wider text-ink">
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
                  Save Tax
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
