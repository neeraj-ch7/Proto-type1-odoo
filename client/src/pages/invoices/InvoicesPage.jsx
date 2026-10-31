import React from 'react';

export default function InvoicesPage() {
  return (
    <div className="space-y-4">
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-ink">Invoices</h1>
        <p className="text-xs uppercase tracking-wider text-line mt-1">Automated recurring billing and payment tracking (P3 domain).</p>
      </div>
      <div className="p-8 bg-white border border-line text-center text-xs uppercase tracking-widest text-line">
        Invoices calculated using P2 pricing service with snapshot tax rates and atomic discount proration.
      </div>
    </div>
  );
}
