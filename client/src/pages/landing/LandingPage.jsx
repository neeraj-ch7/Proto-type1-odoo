import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPublicPlans } from '../../api/catalog.api';
import { formatCurrency } from '../../utils/format';
import { Check, ArrowRight, ShieldCheck, Zap, Repeat, Layers } from 'lucide-react';

export default function LandingPage() {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getPublicPlans()
      .then((data) => {
        setPlans(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to load public plans:', err);
      })
      .finally(() => {
        setLoadingPlans(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-cream text-ink font-sans antialiased selection:bg-maroon selection:text-white">
      {/* 1. PublicNav */}
      <nav className="border-b border-line bg-cream sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* BRIGHTLOOP wordmark */}
          <Link to="/" className="text-xl font-black tracking-widest uppercase text-ink">
            BRIGHTLOOP
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-ink">
            <a href="#plans" className="hover:text-maroon transition-colors">
              Plans
            </a>
            <a href="#how-it-works" className="hover:text-maroon transition-colors">
              How It Works
            </a>
            <Link to="/portal" className="hover:text-maroon transition-colors">
              Customer Portal
            </Link>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink border border-line hover:bg-white transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-maroon text-white hover:bg-maroonDeep transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto border-b border-line">
        <div className="max-w-3xl">
          <div className="text-xs font-bold uppercase tracking-widest text-maroon mb-4">
            SUBSCRIPTION MANAGEMENT
          </div>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-ink leading-none mb-6">
            Plans, invoices and renewals. One place.
          </h1>
          <p className="text-sm sm:text-base text-line uppercase tracking-wider mb-8 leading-relaxed">
            The mission-critical recurring revenue engine for Brightloop Software. Engineered for sub-second catalog lookup, automated tax snapshots, and atomic discount consumption.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-maroon text-white px-6 py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-maroonDeep transition-colors"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#plans"
              className="px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-ink border border-line bg-white hover:bg-cream transition-colors"
            >
              View Plans
            </a>
          </div>
        </div>
      </section>

      {/* 3. Maroon Panel with SUB-0001 status stepper card */}
      <section className="bg-maroon text-cream py-16 px-6 border-b border-line">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-cream/70">
              LIFECYCLE ARCHITECTURE
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight leading-tight">
              State-Driven Subscription Transitions
            </h2>
            <p className="text-xs text-cream/80 uppercase tracking-wider leading-relaxed">
              Every subscription transitions deterministically through Draft, Quotation, Confirmed, Active, and Closed. Backed by transactional integrity and automated recurring invoice generation.
            </p>
          </div>

          <div className="lg:col-span-7">
            {/* The SUB-0001 Stepper Card */}
            <div className="bg-cream text-ink border-2 border-ink p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-maroon">
                    REFERENCE SUBSCRIPTION
                  </div>
                  <div className="text-2xl font-black font-mono tracking-tight text-ink">
                    SUB-0001
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-confirmed">CONFIRMED</span>
                  <span className="badge-active">ACTIVE NOW</span>
                </div>
              </div>

              {/* Status Stepper */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-line mb-3">
                  SUBSCRIPTION LIFECYCLE PROGRESSION
                </div>
                <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px] sm:text-xs uppercase font-bold">
                  {/* Step 1: Draft */}
                  <div className="border border-line bg-white/60 p-2 text-line">
                    <div className="text-[9px] opacity-60">01</div>
                    <div>DRAFT</div>
                    <div className="text-[9px] text-green-700 mt-0.5">✓ PASS</div>
                  </div>
                  {/* Step 2: Quotation */}
                  <div className="border border-line bg-white/60 p-2 text-line">
                    <div className="text-[9px] opacity-60">02</div>
                    <div>QUOTATION</div>
                    <div className="text-[9px] text-green-700 mt-0.5">✓ PASS</div>
                  </div>
                  {/* Step 3: Confirmed */}
                  <div className="border border-line bg-white/60 p-2 text-line">
                    <div className="text-[9px] opacity-60">03</div>
                    <div>CONFIRMED</div>
                    <div className="text-[9px] text-green-700 mt-0.5">✓ PASS</div>
                  </div>
                  {/* Step 4: Active (HIGHLIGHTED) */}
                  <div className="border-2 border-maroon bg-maroon text-white p-2 shadow-sm scale-105 z-10">
                    <div className="text-[9px] text-white/80">04</div>
                    <div className="font-black">ACTIVE</div>
                    <div className="text-[9px] text-white/90 mt-0.5">● RUNNING</div>
                  </div>
                  {/* Step 5: Closed */}
                  <div className="border border-line bg-white/30 p-2 text-line/50">
                    <div className="text-[9px] opacity-40">05</div>
                    <div>CLOSED</div>
                    <div className="text-[9px] mt-0.5">—</div>
                  </div>
                </div>
              </div>

              {/* Metadata row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-line/40 text-[11px] font-mono uppercase">
                <div>
                  <div className="text-line text-[9px]">PLAN</div>
                  <div className="font-bold">ENTERPRISE PRO</div>
                </div>
                <div>
                  <div className="text-line text-[9px]">BILLING</div>
                  <div className="font-bold">MONTHLY</div>
                </div>
                <div>
                  <div className="text-line text-[9px]">NEXT INVOICE</div>
                  <div className="font-bold text-maroon">01/11/2026</div>
                </div>
                <div>
                  <div className="text-line text-[9px]">DISCOUNT</div>
                  <div className="font-bold">15% APPLIED</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PLANS Section rendering real cards from GET /api/plans/public */}
      <section id="plans" className="py-20 px-6 max-w-7xl mx-auto border-b border-line">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-bold uppercase tracking-widest text-maroon mb-2">
            AVAILABLE TIERS
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-ink">
            Transparent, Structured Plans
          </h2>
          <p className="text-xs uppercase tracking-wider text-line mt-2">
            Live catalog synchronized in real-time with our Supabase subscription engine.
          </p>
        </div>

        {loadingPlans ? (
          <div className="text-center py-12 text-xs uppercase tracking-widest text-line">
            Loading public plans from API...
          </div>
        ) : plans.length === 0 ? (
          <div className="p-8 bg-white border border-line text-center text-xs uppercase tracking-widest text-line">
            No active plans available at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((p, idx) => {
              // Middle card or second card highlighted in maroon
              const isMiddle = idx === 1 || (plans.length === 1 && idx === 0);

              return (
                <div
                  key={p.id}
                  className={`border-2 p-8 flex flex-col justify-between transition-transform duration-200 ${
                    isMiddle
                      ? 'bg-maroon text-white border-maroon scale-105 z-10'
                      : 'bg-white text-ink border-line'
                  }`}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 border ${
                          isMiddle ? 'border-white text-white' : 'border-line text-line'
                        }`}
                      >
                        {p.billingPeriod}
                      </span>
                      {isMiddle && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-white text-maroon px-2 py-0.5">
                          MOST POPULAR
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight">
                        {p.name}
                      </h3>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-4xl font-black font-mono">
                          {formatCurrency(p.price)}
                        </span>
                        <span className={`text-xs uppercase font-mono ${isMiddle ? 'text-cream/70' : 'text-line'}`}>
                          /{p.billingPeriod}
                        </span>
                      </div>
                    </div>

                    <ul className={`space-y-3 text-xs uppercase tracking-wider border-t pt-6 ${isMiddle ? 'border-white/20' : 'border-line/40'}`}>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0 text-current" />
                        <span>Minimum Quantity: {p.minQty} Unit(s)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0 text-current" />
                        <span>Recurring Invoicing with Tax Automation</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0 text-current" />
                        <span>Customer Self-Service Portal Access</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0 text-current" />
                        <span>{p.autoClose ? 'Auto-Closes at End of Term' : 'Flexible Renewal Policy'}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8 pt-6">
                    <button
                      onClick={() => navigate('/register')}
                      className={`w-full py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                        isMiddle
                          ? 'bg-white text-maroon hover:bg-cream'
                          : 'bg-maroon text-white hover:bg-maroonDeep'
                      }`}
                    >
                      Choose Plan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto border-b border-line">
        <div className="max-w-2xl mb-12">
          <div className="text-xs font-bold uppercase tracking-widest text-maroon mb-2">
            OPERATIONAL PIPELINE
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-ink">
            How Brightloop Automates Subscriptions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-line p-6 space-y-4">
            <div className="text-3xl font-black font-mono text-maroon">01</div>
            <h3 className="text-base font-bold uppercase tracking-tight text-ink">
              Product & Plan Definition
            </h3>
            <p className="text-xs uppercase tracking-wider text-line leading-relaxed">
              Define catalog items with attribute variants (e.g. Brand, Tier), recurring billing frequencies, and statutory tax rates.
            </p>
          </div>

          <div className="bg-white border border-line p-6 space-y-4">
            <div className="text-3xl font-black font-mono text-maroon">02</div>
            <h3 className="text-base font-bold uppercase tracking-tight text-ink">
              Quotations & Recurring Billing
            </h3>
            <p className="text-xs uppercase tracking-wider text-line leading-relaxed">
              Issue quotation templates with set validity dates. Once confirmed, subscriptions schedule recurring invoices automatically.
            </p>
          </div>

          <div className="bg-white border border-line p-6 space-y-4">
            <div className="text-3xl font-black font-mono text-maroon">03</div>
            <h3 className="text-base font-bold uppercase tracking-tight text-ink">
              Payments & Real-Time Insights
            </h3>
            <p className="text-xs uppercase tracking-wider text-line leading-relaxed">
              Track invoices from Draft to Confirmed to Paid. Customers access an isolated portal to review invoices and download receipts.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Dark Footer */}
      <footer className="bg-[#1A1614] text-cream py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border-b border-[#332E2B] pb-8 mb-8">
          <div>
            <span className="text-xl font-black tracking-widest uppercase text-cream">
              BRIGHTLOOP
            </span>
            <p className="text-xs uppercase tracking-widest text-cream/50 mt-1">
              SUBSCRIPTION & REVENUE MANAGEMENT PLATFORM
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-xs uppercase font-bold tracking-wider text-cream/70">
            <a href="#plans" className="hover:text-white transition-colors">Plans</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <Link to="/portal" className="hover:text-white transition-colors">Customer Portal</Link>
            <Link to="/login" className="hover:text-white transition-colors">Admin Log In</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono uppercase tracking-widest text-cream/40">
          <div>© {new Date().getFullYear()} BRIGHTLOOP SOFTWARE. ALL RIGHTS RESERVED.</div>
          <div>BUILT WITH SUPABASE & POSTGRES</div>
        </div>
      </footer>
    </div>
  );
}
