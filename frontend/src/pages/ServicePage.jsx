import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getServiceBySlug } from '../services/api';

export default function ServicePage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    getServiceBySlug(slug)
      .then((data) => {
        if (!cancelled) setService(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setService(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-500 mb-4">Service not found.</p>
        <Link to="/" className="text-m4m-purple font-medium hover:underline">Back to Marketplace</Link>
      </div>
    );
  }

  const offerTypes = service.offer_types ?? service.offerTypes ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <nav className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-m4m-purple">Marketplace</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{service.name}</span>
      </nav>

      <div className="flex items-center gap-4 mb-6">
        <span className="text-4xl md:text-5xl flex-shrink-0" role="img" aria-hidden>
          {service.icon || '📦'}
        </span>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{service.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Choose an offer type to see seller products</p>
        </div>
      </div>

      {offerTypes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {offerTypes.map((ot) => (
            <Link
              key={ot.id}
              to={`/offer-type/${ot.slug}`}
              className="flex items-center gap-3 p-4 rounded-xl border border-m4m-gray-200 bg-white hover:border-m4m-purple hover:shadow-md transition-all text-left"
            >
              <span className="text-2xl flex-shrink-0">{ot.icon || '📋'}</span>
              <span className="font-medium text-m4m-black truncate">{ot.name}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500 mb-4">No offer types for this service yet.</p>
          <Link to="/" className="text-m4m-purple font-medium hover:underline">Browse Marketplace</Link>
        </div>
      )}
    </div>
  );
}
