import React from 'react';
import { Navigate } from 'react-router-dom';

export default function PortalPage() {
  return <Navigate to="/portal/subscriptions" replace />;
}
