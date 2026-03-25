import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getCurrentUrl, seoAbsoluteImageUrl } from '../lib/seoUrl';
import { getServiceBySlug } from '../services/api';

const SEO_DEFAULT_DESCRIPTION = 'Buy digital products instantly on M4M Marketplace.';

function seoServicePageUrl(slug) {
  if (typeof window === 'undefined') return '';
  const s = slug != null ? String(slug).trim() : '';
  if (!s) return `${window.location.origin}/`;
  return `${window.location.origin}/service/${encodeURIComponent(s)}`;
}

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

  const serviceSeoFallback = seoServicePageUrl(slug);
  const currentUrl = getCurrentUrl(serviceSeoFallback);

  const serviceForSeo = !loading && service && !error ? service : null;
  const serviceNameSafe =
    serviceForSeo?.name != null && String(serviceForSeo.name).trim() !== ''
      ? String(serviceForSeo.name).trim()
      : '';
  const servicePageTitle = serviceNameSafe ? `${serviceNameSafe} | M4M Marketplace` : 'M4M Marketplace';
  const serviceMetaDescription = serviceNameSafe
    ? `Browse ${serviceNameSafe} on M4M. Digital products and instant delivery.`
    : SEO_DEFAULT_DESCRIPTION;
  const serviceOgDescription = serviceNameSafe
    ? `Browse ${serviceNameSafe} on M4M Marketplace.`
    : SEO_DEFAULT_DESCRIPTION;
  const serviceOgTitle = serviceNameSafe || 'M4M Marketplace';
  const serviceOgImage = seoAbsoluteImageUrl();

  const offerTypes = service?.offer_types ?? service?.offerTypes ?? [];

  return (
    <>
      <Helmet>
        <title>{servicePageTitle}</title>
        <meta name="description" content={serviceMetaDescription} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={currentUrl} />
        <meta property="og:title" content={serviceOgTitle} />
        <meta property="og:description" content={serviceOgDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:image" content={serviceOgImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={serviceOgTitle} />
        <meta name="twitter:description" content={serviceOgDescription} />
        <meta name="twitter:image" content={serviceOgImage} />
      </Helmet>
      {loading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : error || !service ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-gray-500 mb-4">Service not found.</p>
          <Link to="/" className="text-m4m-purple font-medium hover:underline">Back to Marketplace</Link>
        </div>
      ) : (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <nav className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-m4m-purple">Marketplace</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{service.name}</span>
      </nav>

      <div className="flex items-center gap-4 mb-6">
        <span className="text-4xl md:text-5xl flex-shrink-0" role="img" aria-hidden>
          {service.icon || (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10l9 4 9-4V7" />
            </svg>
          )}
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
              <span className="text-2xl flex-shrink-0">
                {ot.icon || (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h10a1 1 0 011 1v14a1 1 0 01-1 1H8l-4-4V5a1 1 0 011-1h3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M9 8h6M9 16h3" />
                  </svg>
                )}
              </span>
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
      )}
    </>
  );
}
