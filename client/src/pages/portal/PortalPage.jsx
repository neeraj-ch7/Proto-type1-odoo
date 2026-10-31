import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PortalPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-maroon">
              BRIGHTLOOP CUSTOMER PORTAL
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tight text-ink mt-1">
              Welcome, {user?.name || user?.email || 'Customer'}
            </h1>
          </div>
          <Link
            to="/"
            className="px-4 py-2 border border-line text-xs font-bold uppercase tracking-wider bg-white hover:bg-cream"
          >
            Back to Home
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-line p-6 space-y-4">
            <h2 className="text-base font-black uppercase text-ink">My Subscriptions</h2>
            <p className="text-xs uppercase text-line">
              Isolated customer-scoped subscriptions fetched via /api/me/subscriptions.
            </p>
          </div>
          <div className="bg-white border border-line p-6 space-y-4">
            <h2 className="text-base font-black uppercase text-ink">My Invoices & Receipts</h2>
            <p className="text-xs uppercase text-line">
              Download and review past invoices and tax deductions scoped to your user ID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
