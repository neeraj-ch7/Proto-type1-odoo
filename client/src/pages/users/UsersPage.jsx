import React from 'react';

export default function UsersPage() {
  return (
    <div className="space-y-4">
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-ink">Staff & Users</h1>
        <p className="text-xs uppercase tracking-wider text-line mt-1">Admin user management and staff provisioning (P1 domain).</p>
      </div>
      <div className="p-8 bg-white border border-line text-center text-xs uppercase tracking-widest text-line">
        Manage staff and customers via /api/users and /api/staff with strict role-based access control.
      </div>
    </div>
  );
}
