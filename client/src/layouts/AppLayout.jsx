import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNavForRole } from '../config/nav';
import { LogOut, Menu, X } from 'lucide-react';

export default function AppLayout() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || 'staff';
  const navSections = getNavForRole(role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col lg:flex-row antialiased font-sans">
      {/* Mobile Header Bar (< 1024px) */}
      <div className="lg:hidden bg-ink text-cream px-4 py-3 flex items-center justify-between border-b border-line sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-widest uppercase text-cream">
            BRIGHTLOOP
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-maroon text-white px-2 py-0.5">
            {role}
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 text-cream hover:text-maroon focus:outline-none cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar: Fixed/Sticky ~280px ink sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-[280px] flex-shrink-0 bg-ink text-cream flex flex-col border-r border-line transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 lg:p-6 border-b border-[#332E2B]">
          <div className="flex items-center justify-between">
            <span className="text-xl font-black tracking-widest text-cream uppercase">
              BRIGHTLOOP
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-maroon text-white px-2 py-0.5">
              {role}
            </span>
          </div>
          <div className="text-xs text-cream/60 mt-1 uppercase tracking-wider truncate">
            {user?.email || 'System'}
          </div>
        </div>

        {/* Dynamic Navigation from config/nav.js */}
        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
          {navSections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {sec.section && (
                <div className="px-3 py-1 text-[11px] font-bold text-cream/40 uppercase tracking-widest">
                  {sec.section}
                </div>
              )}
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobile}
                    className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                      isActive
                        ? 'bg-maroon text-white font-bold'
                        : 'text-cream/80 hover:bg-[#2A2420] hover:text-white'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Dev switcher + Sign Out */}
        <div className="p-4 border-t border-[#332E2B] bg-[#14110F] space-y-3">
          {switchRole && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-cream/50">
                Dev Role Switch
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => switchRole('admin')}
                  className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider border ${
                    role === 'admin'
                      ? 'bg-maroon text-white border-maroon'
                      : 'border-[#332E2B] text-cream/70 hover:bg-[#2A2420]'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => switchRole('staff')}
                  className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider border ${
                    role === 'staff'
                      ? 'bg-maroon text-white border-maroon'
                      : 'border-[#332E2B] text-cream/70 hover:bg-[#2A2420]'
                  }`}
                >
                  Staff
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold uppercase tracking-wider text-cream/70 hover:text-white hover:bg-[#2A2420] border border-transparent hover:border-[#332E2B] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden overflow-y-auto">
        <header className="bg-cream border-b border-line px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 truncate">
            <span className="text-xs uppercase tracking-widest font-bold text-line">
              WORKSPACE
            </span>
            <span className="text-xs text-line">/</span>
            <span className="text-xs uppercase tracking-widest font-bold text-maroon truncate">
              {role === 'admin' ? 'ADMIN ACCESS' : 'STAFF ACCESS'}
            </span>
          </div>
          <div className="text-xs text-ink/70 uppercase tracking-widest font-mono flex-shrink-0">
            {new Date().toLocaleDateString('en-GB')}
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
