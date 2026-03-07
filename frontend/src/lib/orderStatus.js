/**
 * Order status display config: card border/badge colors for Orders page.
 * Backend may return: pending, paid, processing, delivered, completed, cancelled, dispute
 */
export function getOrderStatusStyle(status) {
  const s = (status || '').toLowerCase();
  const configs = {
    pending: {
      border: 'border-l-amber-500',
      bg: 'bg-amber-50',
      badge: 'bg-amber-100 text-amber-800',
      label: 'Pending',
    },
    paid: {
      border: 'border-l-blue-500',
      bg: 'bg-blue-50',
      badge: 'bg-blue-100 text-blue-800',
      label: 'Paid',
    },
    processing: {
      border: 'border-l-indigo-500',
      bg: 'bg-indigo-50',
      badge: 'bg-indigo-100 text-indigo-800',
      label: 'Processing',
    },
    delivered: {
      border: 'border-l-teal-500',
      bg: 'bg-teal-50',
      badge: 'bg-teal-100 text-teal-800',
      label: 'Delivered',
    },
    completed: {
      border: 'border-l-green-500',
      bg: 'bg-green-50',
      badge: 'bg-green-100 text-green-800',
      label: 'Completed',
    },
    cancelled: {
      border: 'border-l-red-500',
      bg: 'bg-red-50',
      badge: 'bg-red-100 text-red-800',
      label: 'Cancelled',
    },
    dispute: {
      border: 'border-l-orange-500',
      bg: 'bg-orange-50',
      badge: 'bg-orange-100 text-orange-800',
      label: 'Dispute',
    },
  };
  return configs[s] || {
    border: 'border-l-m4m-gray-400',
    bg: 'bg-m4m-gray-50',
    badge: 'bg-m4m-gray-200 text-m4m-gray-800',
    label: (status && status.charAt(0).toUpperCase() + status.slice(1)) || '—',
  };
}

export const ORDER_STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'dispute', label: 'Dispute' },
];
