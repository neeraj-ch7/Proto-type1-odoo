import {
  LayoutDashboard,
  Receipt,
  FileText,
  CreditCard,
  Users,
  Package,
  Layers,
  Percent,
  ShieldCheck,
} from 'lucide-react';

export const ADMIN_NAV = [
  { section: 'Overview', items: [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Operations', items: [
    { label: 'Subscriptions', path: '/app/subscriptions', icon: Receipt },
    { label: 'Invoices', path: '/app/invoices', icon: FileText },
    { label: 'Payments', path: '/app/payments', icon: CreditCard },
    { label: 'Customers', path: '/app/customers', icon: Users },
  ]},
  { section: 'Catalog', items: [
    { label: 'Products', path: '/app/products', icon: Package },
    { label: 'Plans', path: '/app/plans', icon: Layers },
    { label: 'Templates', path: '/app/templates', icon: FileText },
    { label: 'Discounts', path: '/app/discounts', icon: Percent },
    { label: 'Taxes', path: '/app/taxes', icon: Receipt },
  ]},
  { section: 'Administration', items: [
    { label: 'Staff & Users', path: '/app/users', icon: ShieldCheck },
  ]},
];

export const STAFF_NAV = [
  { section: 'Overview', items: [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Operations', items: [
    { label: 'Subscriptions', path: '/app/subscriptions', icon: Receipt },
    { label: 'Invoices', path: '/app/invoices', icon: FileText },
    { label: 'Payments', path: '/app/payments', icon: CreditCard },
    { label: 'Customers', path: '/app/customers', icon: Users },
  ]},
  { section: 'Catalog (View Only)', items: [
    { label: 'Products', path: '/app/products', icon: Package },
    { label: 'Plans', path: '/app/plans', icon: Layers },
    { label: 'Templates', path: '/app/templates', icon: FileText },
    { label: 'Discounts', path: '/app/discounts', icon: Percent },
    { label: 'Taxes', path: '/app/taxes', icon: Receipt },
  ]},
];

export const PORTAL_NAV = [
  { label: 'My Subscriptions', path: '/portal/subscriptions' },
  { label: 'My Invoices', path: '/portal/invoices' },
];

export const getNavForRole = (role) => {
  if (role === 'admin') return ADMIN_NAV;
  if (role === 'staff') return STAFF_NAV;
  return [];
};
