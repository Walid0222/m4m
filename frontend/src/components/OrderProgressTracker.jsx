/**
 * Order Progress Tracker – Z2U-style order timeline.
 * Desktop: horizontal progress bar. Mobile: vertical timeline.
 */

const STEPS = [
  {
    key: 'pending',
    label: 'Pending',
    description: 'Order placed. Your payment was received and the order is waiting for seller processing.',
  },
  {
    key: 'processing',
    label: 'Processing',
    description: 'Seller preparing order. The seller is currently preparing your product or service.',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'Order delivered. The seller marked the order as delivered. Please review the product.',
  },
  {
    key: 'completed',
    label: 'Completed',
    description: 'Order completed. You confirmed the delivery and the order is finished.',
  },
  {
    key: 'disputed',
    label: 'Disputed',
    description: 'Dispute opened. The order is under review by the marketplace support team.',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    description: 'Order cancelled or refunded.',
  },
];

function getStatusIndex(status) {
  const s = (status || '').toLowerCase();
  const alias = { dispute: 'disputed', paid: 'processing' };
  const normalized = alias[s] ?? s;
  const idx = STEPS.findIndex((step) => step.key === normalized);
  return idx >= 0 ? idx : 0;
}

export default function OrderProgressTracker({ status }) {
  const currentIdx = getStatusIndex(status);

  return (
    <div className="mb-6">
      {/* Desktop: horizontal progress bar */}
      <div className="hidden md:block rounded-xl border border-gray-200 bg-white p-6">
        <div className="relative">
          {/* Background track */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
          {/* Progress track */}
          <div
            className="absolute top-4 left-0 h-0.5 bg-m4m-purple transition-all"
            style={{ width: `${currentIdx > 0 ? (currentIdx / (STEPS.length - 1)) * 100 : 0}%` }}
          />
          <div className="relative flex justify-between">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={step.key} className="flex flex-col items-center" style={{ width: `${100 / STEPS.length}%` }}>
                  <div
                    className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      isCompleted
                        ? 'bg-m4m-purple border-m4m-purple text-white'
                        : isCurrent
                          ? 'bg-white border-m4m-purple text-m4m-purple ring-4 ring-m4m-purple/20'
                          : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <div className="mt-3 text-center px-1 max-w-[100px]">
                    <p className={`text-xs font-semibold truncate w-full ${isCurrent ? 'text-m4m-purple' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: vertical timeline */}
      <div className="md:hidden rounded-xl border border-gray-200 bg-white p-4">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={step.key} className="flex gap-4">
              {/* Timeline column */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    isCompleted
                      ? 'bg-m4m-purple border-m4m-purple text-white'
                      : isCurrent
                        ? 'bg-white border-m4m-purple text-m4m-purple ring-4 ring-m4m-purple/20'
                        : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-0.5 min-h-[32px] ${isCompleted ? 'bg-m4m-purple' : 'bg-gray-200'}`} />
                )}
              </div>
              {/* Content */}
              <div className="pb-4 pt-0.5 flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isCurrent ? 'text-m4m-purple' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  ({step.description})
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
