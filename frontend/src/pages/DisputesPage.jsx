import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDisputes, paginatedItems } from '../services/api';

const STATUS_STYLES = {
  open:         'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  resolved:     'bg-green-100 text-green-700',
  refunded:     'bg-purple-100 text-purple-700',
};

const STATUS_LABELS = {
  open:         'Open',
  under_review: 'Under Review',
  resolved:     'Resolved',
  refunded:     'Refunded',
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDisputes({ per_page: 50 });
      setDisputes(paginatedItems(data) ?? []);
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Disputes</h1>
          <p className="text-sm text-gray-500">Track the status of your opened disputes</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 flex gap-3">
        <svg className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>M4M holds your payment securely until your order is completed. If you have an issue with a delivery, open a dispute from your order page and our team will review it within 24 hours.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-white border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No disputes opened</h3>
          <p className="text-gray-500 text-sm">If you experience an issue with a delivery, you can open a dispute from your order page.</p>
          <Link to="/orders" className="mt-4 inline-block text-sm font-semibold text-m4m-purple hover:underline">
            View my orders →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <div key={dispute.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[dispute.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[dispute.status] ?? dispute.status}
                    </span>
                    {dispute.admin_decision && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        dispute.admin_decision === 'refund_buyer' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {dispute.admin_decision === 'refund_buyer' ? 'Refunded' : 'Released'}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">
                    Order: {dispute.order?.order_number ?? `#${dispute.order_id}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    <span className="font-medium">Buyer reason:</span> {dispute.reason}
                  </p>
                  {dispute.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{dispute.description}</p>
                  )}
                  {dispute.seller && (
                    <p className="text-xs text-gray-400 mt-1">Seller: {dispute.seller.name}</p>
                  )}
                  {dispute.admin_decision && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700">
                      <p className="font-medium mb-0.5">Our team reviewed the dispute.</p>
                      <p className="mb-0.5">
                        <span className="font-medium">Decision:</span>{' '}
                        {dispute.admin_decision === 'refund_buyer' ? 'Buyer refunded' : 'Seller payment released'}
                      </p>
                      {dispute.admin_note && (
                        <p className="mb-0.5">
                          <span className="font-medium">Reason:</span> {dispute.admin_note}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">
                    {dispute.created_at ? new Date(dispute.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''}
                  </p>
                  <Link
                    to={`/orders/${dispute.order_id}`}
                    className="mt-2 inline-block text-xs font-semibold text-m4m-purple hover:underline"
                  >
                    View Order →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
