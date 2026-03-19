import { Link } from 'react-router-dom';

export default function OfferTypeTabs({ currentSlug, offerTypes }) {
  if (!Array.isArray(offerTypes) || offerTypes.length <= 1) return null;

  return (
    <div className="mb-0">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full overflow-x-auto px-2">
          <div className="inline-flex bg-white/60 backdrop-blur rounded-xl p-1 shadow-sm transition-all duration-200">
            {offerTypes.map((ot) => {
              const active = ot.slug === currentSlug;
              return (
                <Link
                  key={ot.id}
                  to={`/offer-type/${ot.slug}`}
                  className={`px-4 sm:px-6 py-2 text-sm rounded-xl whitespace-nowrap transition-all duration-200 ${
                    active
                      ? 'bg-white shadow-sm text-m4m-purple font-semibold'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-white/60 hover:shadow-sm'
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
