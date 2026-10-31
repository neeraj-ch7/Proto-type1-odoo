import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-ink">
          Finance & Subscription Dashboard
        </h1>
        <p className="text-xs uppercase tracking-wider text-line mt-1">
          Revenue, active subscriptions, and overdue analytics (P4 domain).
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-line p-5">
          <div className="text-[11px] font-bold uppercase text-line">Active Subscriptions</div>
          <div className="text-3xl font-black font-mono text-ink mt-2">1,248</div>
        </div>
        <div className="bg-white border border-line p-5">
          <div className="text-[11px] font-bold uppercase text-line">Revenue Collected</div>
          <div className="text-3xl font-black font-mono text-maroon mt-2">₹12,48,900</div>
        </div>
        <div className="bg-white border border-line p-5">
          <div className="text-[11px] font-bold uppercase text-line">Still Owed</div>
          <div className="text-3xl font-black font-mono text-ink mt-2">₹1,24,500</div>
        </div>
        <div className="bg-white border border-line p-5">
          <div className="text-[11px] font-bold uppercase text-line">Overdue Invoices</div>
          <div className="text-3xl font-black font-mono text-maroon mt-2">7</div>
        </div>
      </div>
    </div>
  );
}
