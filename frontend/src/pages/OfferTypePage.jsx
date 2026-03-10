import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOfferTypeBySlug } from '../services/api';
import ProductCard from '../components/ProductCard';
import { paginatedItems } from '../services/api';
import OfferTypeTabs from '../components/OfferTypeTabs';

export default function OfferTypePage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOfferTypeBySlug(slug)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setData(null);
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
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-500 mb-4">Service type not found.</p>
        <Link to="/" className="text-m4m-purple font-medium hover:underline">Back to Marketplace</Link>
      </div>
    );
  }

  const offerType = data.offer_type || data;
  const productsRaw = data.products;
  const serviceOfferTypes = data.service_offer_types || [];
  const products = Array.isArray(productsRaw)
    ? productsRaw
    : (productsRaw?.data ?? paginatedItems(productsRaw) ?? []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">

      {serviceOfferTypes.length > 1 && (
        <OfferTypeTabs currentSlug={offerType.slug} offerTypes={serviceOfferTypes} />
      )}

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{offerType.name}</h1>
      {offerType.description && (
        <p className="text-gray-600 mb-6 max-w-2xl">{offerType.description}</p>
      )}

      {Array.isArray(products) && products.length > 0 ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {products.length} seller{products.length !== 1 ? 's' : ''} offering this service
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500 mb-4">No sellers are offering this service yet.</p>
          <Link to="/" className="text-m4m-purple font-medium hover:underline">Browse Marketplace</Link>
        </div>
      )}
    </div>
  );
}
