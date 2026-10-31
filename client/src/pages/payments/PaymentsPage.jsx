import React from 'react';

export default function PaymentsPage() {
  return (
    <div className="space-y-4">
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-ink">Payments</h1>
        <p className="text-xs uppercase tracking-wider text-line mt-1">Multi-channel payments against confirmed invoices (P4 domain).</p>
      </div>
      <div className="p-8 bg-white border border-line text-center text-xs uppercase tracking-widest text-line">
        Recorded payments update invoice amountPaid and automatically transition fully-paid invoices to PAID.
      </div>
    </div>
  );
}
