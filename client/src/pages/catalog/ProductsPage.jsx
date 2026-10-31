import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../api/catalog.api';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'software',
    salesPrice: 0,
    costPrice: 0,
    notes: '',
    active: true,
    variants: [],
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts({ page, limit, search: search.trim() });
      setProducts(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [page, search]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      type: 'software',
      salesPrice: 1000,
      costPrice: 200,
      notes: '',
      active: true,
      variants: [],
    });
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      type: p.type || 'software',
      salesPrice: p.salesPrice,
      costPrice: p.costPrice || 0,
      notes: p.notes || '',
      active: p.active,
      variants: Array.isArray(p.variants) ? [...p.variants] : [],
    });
    setModalOpen(true);
  };

  const addVariantRow = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { attribute: 'Brand', value: '', extraPrice: 0 }],
    });
  };

  const updateVariantRow = (index, field, value) => {
    const updated = [...formData.variants];
    updated[index] = { ...updated[index], [field]: field === 'extraPrice' ? Number(value) : value };
    setFormData({ ...formData, variants: updated });
  };

  const removeVariantRow = (index) => {
    const updated = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
        toast.success('Product updated');
      } else {
        await createProduct(formData);
        toast.success('Product created');
      }
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-ink">
            Product Catalog
          </h1>
          <p className="text-xs uppercase tracking-wider text-line mt-1">
            Manage base products and their attribute variants with snapshot pricing.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-maroonDeep transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      {/* Controls: Search */}
      <div className="flex items-center gap-4 bg-white p-4 border border-line">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-line" />
          <input
            type="text"
            placeholder="SEARCH PRODUCTS BY NAME OR TYPE..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs uppercase tracking-wider bg-cream/40 border border-line focus:outline-none focus:border-maroon"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-line overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-cream/80 text-[11px] font-bold uppercase tracking-wider text-ink">
              <th className="p-3">Product Name</th>
              <th className="p-3">Type</th>
              <th className="p-3 text-right">Sales Price</th>
              <th className="p-3 text-right">Cost Price</th>
              <th className="p-3">Variants</th>
              <th className="p-3 text-center">Status</th>
              {isAdmin && <th className="p-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/30 text-xs">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-line uppercase tracking-widest">
                  Loading products...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-line uppercase tracking-widest">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-cream/30 transition-colors">
                  <td className="p-3 font-semibold text-ink">
                    <div className="font-bold">{p.name}</div>
                    {p.notes && <div className="text-[11px] text-line normal-case">{p.notes}</div>}
                  </td>
                  <td className="p-3 uppercase text-[11px] font-mono text-line">{p.type}</td>
                  <td className="p-3 text-right font-mono font-bold text-ink">
                    {formatCurrency(p.salesPrice)}
                  </td>
                  <td className="p-3 text-right font-mono text-line">
                    {p.costPrice ? formatCurrency(p.costPrice) : '—'}
                  </td>
                  <td className="p-3">
                    {p.variants && p.variants.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.variants.map((v, i) => (
                          <span
                            key={i}
                            className="text-[10px] uppercase font-mono px-2 py-0.5 border border-line bg-cream/50"
                            title={`Effective price: ${formatCurrency(p.salesPrice + v.extraPrice)}`}
                          >
                            {v.attribute}: {v.value} (+{formatCurrency(v.extraPrice)})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-line italic">None</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={p.active ? 'badge-confirmed' : 'badge-draft'}>
                      {p.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1 hover:text-maroon transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1 hover:text-maroon transition-colors text-line"
                          title="Delete Product"
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

      {/* Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
          <div className="bg-cream border border-line w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-lg font-black uppercase tracking-tight text-ink">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 hover:text-maroon transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Product Name *
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
                    Type
                  </label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2 bg-white border border-line text-xs uppercase focus:outline-none focus:border-maroon"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Sales Price (INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.salesPrice}
                    onChange={(e) => setFormData({ ...formData, salesPrice: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono focus:outline-none focus:border-maroon"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                    Cost Price (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-line text-xs font-mono focus:outline-none focus:border-maroon"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
                  Notes / Description
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 bg-white border border-line text-xs focus:outline-none focus:border-maroon"
                ></textarea>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activeProd"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 accent-maroon"
                />
                <label htmlFor="activeProd" className="text-xs font-bold uppercase tracking-wider text-ink">
                  Active (Available for catalog & quotations)
                </label>
              </div>

              {/* VARIANTS EDITOR */}
              <div className="border-t border-line pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                      Product Variants
                    </h3>
                    <p className="text-[10px] uppercase text-line">
                      Effective price = Sales Price + Extra Price
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="flex items-center gap-1 bg-[#1A1614] text-cream px-3 py-1 text-[11px] font-bold uppercase tracking-wider hover:bg-black transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Variant
                  </button>
                </div>

                {formData.variants.length === 0 ? (
                  <div className="p-4 bg-white/50 border border-line/40 text-center text-xs text-line uppercase tracking-wider">
                    No variants added. Product uses base sales price.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.variants.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-line">
                        <input
                          type="text"
                          placeholder="Attribute (e.g. Brand)"
                          value={v.attribute}
                          onChange={(e) => updateVariantRow(idx, 'attribute', e.target.value)}
                          className="flex-1 p-1.5 bg-cream/40 border border-line text-xs uppercase"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. Odoo)"
                          value={v.value}
                          onChange={(e) => updateVariantRow(idx, 'value', e.target.value)}
                          className="flex-1 p-1.5 bg-cream/40 border border-line text-xs uppercase"
                        />
                        <div className="w-28 flex items-center gap-1">
                          <span className="text-xs font-mono">+₹</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Extra"
                            value={v.extraPrice}
                            onChange={(e) => updateVariantRow(idx, 'extraPrice', e.target.value)}
                            className="w-full p-1.5 bg-cream/40 border border-line text-xs font-mono"
                          />
                        </div>
                        <div className="text-[11px] font-mono font-bold text-maroon whitespace-nowrap px-1">
                          ={formatCurrency(Number(formData.salesPrice || 0) + Number(v.extraPrice || 0))}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariantRow(idx)}
                          className="p-1 text-line hover:text-maroon transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
