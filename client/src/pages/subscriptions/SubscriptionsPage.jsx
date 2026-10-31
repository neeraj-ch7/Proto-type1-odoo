import React from 'react';

export default function SubscriptionsPage() {
  return (
    <div className="space-y-4">
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-ink">Subscriptions</h1>
        <p className="text-xs uppercase tracking-wider text-line mt-1">Lifecycle operations and renewals (P3 domain).</p>
      </div>
      <div className="p-8 bg-white border border-line text-center text-xs uppercase tracking-widest text-line">
        Subscriptions module connected. Active subscriptions flow directly from configured plans and catalog products.
      </div>
    </div>
  );
}
