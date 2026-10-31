import React, { useState, useEffect } from 'react';
import { getMySubscriptions } from '../../api/me.api';
import { formatCurrency, formatDate } from '../../utils/format';
import { StatusStepper, StatusBadge, Button } from '../../components/ui';
import { Receipt, RefreshCw, Calendar, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PortalSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await getMySubscriptions({ limit: 50 });
      setSubscriptions(data.items || []);
    } catch (err) {
      toast.error('Failed to load your subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4 gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-maroon">
            CUSTOMER ACCOUNT
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-ink mt-0.5">
            MY SUBSCRIPTIONS
          </h1>
          <p className="text-xs uppercase tracking-wider text-line mt-1">
            Active and recurring software subscriptions provisioned for your team
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={fetchSubscriptions}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 bg-white border border-line animate-pulse space-y-3">
              <div className="h-5 bg-line/20 w-1/3" />
              <div className="h-4 bg-line/10 w-2/3" />
            </div>
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-white border border-line p-12 text-center space-y-3">
          <Receipt className="w-12 h-12 text-line mx-auto opacity-50" />
          <h3 className="text-base font-bold uppercase tracking-wide text-ink">
            No Subscriptions Found
          </h3>
          <p className="text-xs uppercase tracking-wider text-line max-w-md mx-auto">
            You do not currently have any active software subscriptions. Contact our sales team or administrator to activate a plan.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {subscriptions.map((sub) => {
            const planName = sub.plan?.name || 'Standard Plan';
            const billingPeriod = sub.plan?.billingPeriod || 'monthly';
            const lines = sub.lines || [];

            return (
              <div
                key={sub.id || sub._id}
                className="bg-white border border-ink p-6 space-y-6"
              >
                {/* Subscription Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black uppercase tracking-wider text-ink">
                        {sub.number}
                      </span>
                      <StatusBadge status={sub.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-line font-medium uppercase">
                      <Tag className="w-3.5 h-3.5 text-maroon" />
                      <span>{planName}</span>
                      <span>•</span>
                      <span>Billed {billingPeriod}</span>
                      {sub.paymentTerms && (
                        <>
                          <span>•</span>
                          <span>Terms: {sub.paymentTerms} Days</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase text-line sm:text-right">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Start: {formatDate(sub.startDate)}</span>
                    </div>
                    {sub.nextInvoiceDate && sub.status === 'active' && (
                      <div className="flex items-center gap-1.5 text-maroon font-bold">
                        <span>Next Bill: {formatDate(sub.nextInvoiceDate)}</span>
                      </div>
                    )}
                    {sub.expiryDate && (
                      <div className="flex items-center gap-1.5">
                        <span>Expires: {formatDate(sub.expiryDate)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Stepper */}
                <div className="py-2 bg-cream/30 px-4 border border-line/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-line block mb-1">
                    Lifecycle Progress:
                  </span>
                  <StatusStepper current={sub.status} />
                </div>

                {/* Subscription Line Items */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-ink/40 text-[10px] font-bold uppercase tracking-wider text-line">
                        <th className="py-2 pr-4">Product / Item</th>
                        <th className="py-2 px-4 text-center">Qty</th>
                        <th className="py-2 px-4 text-right">Unit Price</th>
                        <th className="py-2 px-4 text-right">Tax Rate</th>
                        <th className="py-2 pl-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/20">
                      {lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-cream/40">
                          <td className="py-2.5 pr-4 font-semibold text-ink">
                            {line.description || 'Subscription Line'}
                            {line.variantValue && (
                              <span className="ml-2 text-[10px] text-line font-normal">
                                ({line.variantValue})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center text-ink">
                            {line.quantity}
                          </td>
                          <td className="py-2.5 px-4 text-right text-ink">
                            {formatCurrency(line.unitPrice)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-line">
                            {line.taxRate ? `${line.taxRate}%` : '0%'}
                          </td>
                          <td className="py-2.5 pl-4 text-right font-bold text-ink">
                            {formatCurrency(line.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {sub.notes && (
                  <div className="text-[11px] text-line border-t border-line/30 pt-3 uppercase tracking-wide">
                    Note: {sub.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
