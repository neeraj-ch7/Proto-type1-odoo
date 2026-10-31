import React, { useState } from 'react';
import { recordPayment } from '../../api/invoices.api';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

export default function RecordPaymentModal({ invoice, open, onClose, onSaved }) {
  if (!open || !invoice) return null;

  const total = Number(invoice.total || 0);
  const amountPaid = Number(invoice.amountPaid || 0);
  const stillOwed = Math.max(0, total - amountPaid);

  const [method, setMethod] = useState('card');
  const [amount, setAmount] = useState(stillOwed > 0 ? stillOwed : total);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payAmt = Number(amount);
    if (isNaN(payAmt) || payAmt <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      await recordPayment({
        invoice: invoice.id || invoice._id,
        method,
        amount: payAmt,
        date: new Date(date).toISOString(),
        note: note.trim(),
      });
      toast.success('Payment recorded successfully');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-ink w-full max-w-md p-4 sm:p-6 space-y-4 font-sans max-h-[92vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start border-b border-ink pb-3">
          <div>
            <h3 className="text-lg font-bold uppercase tracking-tight text-ink">
              Record Payment
            </h3>
            <p className="text-xs uppercase tracking-[0.08em] text-line mt-1">
              Invoice #{invoice.number} • Still Owed: {formatCurrency(stillOwed)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-line hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
            Payment Method *
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full p-2 border border-ink text-xs uppercase bg-white focus:outline-none"
          >
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
            Amount (INR) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full p-2 border border-ink text-xs focus:outline-none font-bold"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
            Payment Date *
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 border border-ink text-xs focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-line mb-1">
            Note (Optional)
          </label>
          <input
            type="text"
            placeholder="REFERENCE, TRANSACTION ID, ETC."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-2 border border-ink text-xs uppercase focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-ink">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-ink text-xs font-bold uppercase tracking-[0.08em] hover:bg-cream"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-ink text-cream text-xs font-bold uppercase tracking-[0.08em] hover:bg-maroon transition-colors disabled:opacity-50"
          >
            {saving ? 'Recording...' : 'Save Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}

