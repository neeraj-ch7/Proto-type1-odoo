import React from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Receipt, FileText } from 'lucide-react';

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col font-sans antialiased">
      {/* Editorial Top Bar */}
      <header className="bg-ink text-cream border-b border-ink sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-6">
            <Link to="/portal" className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black tracking-widest uppercase text-cream hover:text-maroon transition-colors">
                BRIGHTLOOP
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-maroon text-white px-2 py-0.5">
                PORTAL
              </span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              <NavLink
                to="/portal/subscriptions"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.08em] transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-maroon text-white'
                      : 'text-cream/80 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <Receipt className="w-3.5 h-3.5" />
                MY SUBSCRIPTIONS
              </NavLink>
              <NavLink
                to="/portal/invoices"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.08em] transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-maroon text-white'
                      : 'text-cream/80 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <FileText className="w-3.5 h-3.5" />
                MY INVOICES
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 pt-2.5 md:pt-0 border-white/10">
            <div className="text-left md:text-right min-w-0">
              <div className="text-xs font-bold uppercase text-cream truncate max-w-[180px] sm:max-w-[220px]">
                {user?.name || user?.email || 'Customer'}
              </div>
              <div className="text-[10px] text-cream/60 uppercase tracking-wider truncate max-w-[180px] sm:max-w-[220px]">
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-white/20 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-cream/80 hover:text-white hover:bg-maroon hover:border-maroon transition-colors cursor-pointer flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 overflow-x-hidden">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-line/30 py-4 px-4 sm:px-8 text-center text-[10px] uppercase tracking-widest text-line">
        Brightloop Software Subscription Portal &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
