import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMyInvoice } from '../../api/me.api';
import InvoiceDocument from '../../components/invoices/InvoiceDocument';
import { Button } from '../../components/ui';
import { ArrowLeft, Printer, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PortalInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchInvoice = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const data = await getMyInvoice(id);
        if (mounted) setInvoice(data);
      } catch (err) {
        if (mounted) {
          setNotFound(true);
          toast.error('Invoice not found or unauthorized');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (id) fetchInvoice();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="bg-white border border-line p-12 text-center animate-pulse">
        <p className="text-xs uppercase tracking-widest text-line">Loading invoice details...</p>
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="bg-white border border-maroon p-12 text-center space-y-4 max-w-lg mx-auto font-sans">
        <ShieldAlert className="w-12 h-12 text-maroon mx-auto" />
        <h3 className="text-lg font-bold uppercase tracking-wide text-ink">
          Invoice Not Found
        </h3>
        <p className="text-xs uppercase tracking-wider text-line">
          The requested invoice either does not exist or does not belong to your customer account.
        </p>
        <Link
          to="/portal/invoices"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-cream text-xs font-bold uppercase tracking-wider hover:bg-maroon transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to My Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-line pb-4 print:hidden">
        <Button
          variant="secondary"
          onClick={() => navigate('/portal/invoices')}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Invoices
        </Button>

        <Button
          variant="primary"
          onClick={() => window.print()}
          className="flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Download PDF
        </Button>
      </div>

      {/* Invoice Document Component */}
      <div className="bg-white border border-ink p-2 sm:p-6 lg:p-8 overflow-hidden">
        <InvoiceDocument invoice={invoice} />
      </div>
    </div>
  );
}
