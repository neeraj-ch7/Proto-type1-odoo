import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Layers,
  Percent,
  Receipt,
  FileText,
  LogOut,
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  CreditCard,
  Users,
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col md:flex-row antialiased font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#1A1614] text-cream flex flex-col border-r border-line">
        {/* Brand header */}
        <div className="p-6 border-b border-[#332E2B]">
          <div className="flex items-center justify-between">
            <span className="text-xl font-black tracking-widest text-cream uppercase">
              BRIGHTLOOP
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-maroon text-white px-2 py-0.5">
              {user?.role || 'Guest'}
            </span>
          </div>
          <div className="text-xs text-cream/60 mt-1 uppercase tracking-wider truncate">
            {user?.email || 'System'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          <div className="px-3 py-1 text-[11px] font-bold text-cream/40 uppercase tracking-widest">
            Overview
          </div>
          <NavLink
            to="/app/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>

          <div className="px-3 pt-4 pb-1 text-[11px] font-bold text-cream/40 uppercase tracking-widest">
            Operations
          </div>
          <NavLink
            to="/app/subscriptions"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
              }`
            }
          >
            <Receipt className="w-4 h-4" />
            Subscriptions
          </NavLink>
          <NavLink
            to="/app/invoices"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
              }`
            }
          >
            <FileText className="w-4 h-4" />
            Invoices
          </NavLink>
          <NavLink
            to="/app/payments"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
              }`
            }
          >
            <CreditCard className="w-4 h-4" />
            Payments
          </NavLink>
          <NavLink
            to="/app/customers"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
              }`
            }
          >
            <Users className="w-4 h-4" />
            Customers
          </NavLink>

          {/* Catalog items - Admin & Staff can view; writes are Admin only */}
          <div className="px-3 pt-4 pb-1 text-[11px] font-bold text-cream/40 uppercase tracking-widest">
            Catalog
          </div>
          <NavLink
            to="/app/products"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
              }`
            }
          >
            <Package className="w-4 h-4" />
            Products
          </NavLink>
          <NavLink
            to="/app/plans"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
              }`
            }
          >
            <Layers className="w-4 h-4" />
            Plans
          </NavLink>
          <NavLink
            to="/app/templates"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
              }`
            }
          >
            <FileText className="w-4 h-4" />
            Templates
          </NavLink>
          <NavLink
            to="/app/discounts"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
              }`
            }
          >
            <Percent className="w-4 h-4" />
            Discounts
          </NavLink>
          <NavLink
            to="/app/taxes"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
              }`
            }
          >
            <Receipt className="w-4 h-4" />
            Taxes
          </NavLink>

          {isAdmin && (
            <>
              <div className="px-3 pt-4 pb-1 text-[11px] font-bold text-cream/40 uppercase tracking-widest">
                Administration
              </div>
              <NavLink
                to="/app/users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive ? 'bg-maroon text-white' : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
                  }`
                }
              >
                <ShieldCheck className="w-4 h-4" />
                Staff & Users
              </NavLink>
            </>
          )}
        </nav>

        {/* Role toggle for dev & Logout */}
        <div className="p-4 border-t border-[#332E2B] bg-[#14110F] space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-cream/60">
            <span>Role Switcher (Dev)</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => switchRole('admin')}
              className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider border ${
                isAdmin ? 'bg-maroon text-white border-maroon' : 'border-[#332E2B] text-cream/70 hover:bg-[#2A2420]'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => switchRole('staff')}
              className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider border ${
                isStaff ? 'bg-maroon text-white border-maroon' : 'border-[#332E2B] text-cream/70 hover:bg-[#2A2420]'
              }`}
            >
              Staff
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold uppercase tracking-wider text-cream/60 hover:text-white hover:bg-[#2A2420] border border-transparent hover:border-[#332E2B] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-cream border-b border-line px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest font-bold text-line">
              WORKSPACE
            </span>
            <span className="text-xs text-line">/</span>
            <span className="text-xs uppercase tracking-widest font-bold text-maroon">
              {isAdmin ? 'ADMIN CONTROL' : 'STAFF VIEW (READ-ONLY CATALOG)'}
            </span>
          </div>
          <div className="text-xs text-ink/70 uppercase tracking-widest font-mono">
            {new Date().toLocaleDateString('en-GB')}
          </div>
        </header>
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
