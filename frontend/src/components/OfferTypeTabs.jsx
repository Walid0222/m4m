import { Link } from 'react-router-dom';

export default function OfferTypeTabs({ currentSlug, offerTypes }) {
  if (!Array.isArray(offerTypes) || offerTypes.length <= 1) return null;

  return (
    <div className="mb-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full overflow-x-auto px-2">
          <div className="inline-flex bg-gray-100 rounded-2xl p-1 shadow-sm">
            {offerTypes.map((ot) => {
              const active = ot.slug === currentSlug;
              return (
                <Link
                  key={ot.id}
                  to={`/offer-type/${ot.slug}`}
                  className={`px-4 sm:px-6 py-2 text-sm rounded-xl whitespace-nowrap transition-colors duration-150 ${
                    active
                      ? 'bg-white shadow text-gray-900 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                  }`}
                >
                  {ot.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
