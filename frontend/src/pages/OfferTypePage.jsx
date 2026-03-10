import { useState, useEffect, useMemo } from 'react';
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
  const [sortField, setSortField] = useState('sales');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

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

  // Derive products (safe even when data is null)
  const productsRaw = data?.products;
  const products = Array.isArray(productsRaw)
    ? productsRaw
    : (productsRaw?.data ?? paginatedItems(productsRaw) ?? []);

  // Search filter by product title and seller name
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const title = (p.name || '').toLowerCase();
      const sellerName = (p.seller?.name || '').toLowerCase();
      return title.includes(q) || sellerName.includes(q);
    });
  }, [products, search]);

  // Sorting: one field + asc/desc order
  const sortedProducts = useMemo(() => {
    if (!Array.isArray(filteredProducts)) return [];
    const result = [...filteredProducts];
    const dir = sortOrder === 'asc' ? 1 : -1;

    const getSales = (p) => Number(p.completed_orders_count ?? p.sales ?? 0);
    const getPrice = (p) => Number(p.price || 0);
    const getRating = (p) => Number(p.reviews_avg_rating ?? p.rating ?? 0);
    const getDeliveryValue = (p) => {
      const t = (p.delivery_time || '').toLowerCase();
      const match = t.match(/(\d+)/);
      return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
    };
    const getNewest = (p) => new Date(p.created_at || 0).getTime();

    if (sortField === 'sales') {
      result.sort((a, b) => (getSales(a) - getSales(b)) * dir);
    } else if (sortField === 'price') {
      result.sort((a, b) => (getPrice(a) - getPrice(b)) * dir);
    } else if (sortField === 'rating') {
      result.sort((a, b) => (getRating(a) - getRating(b)) * dir);
    } else if (sortField === 'delivery') {
      result.sort((a, b) => (getDeliveryValue(a) - getDeliveryValue(b)) * dir);
    } else if (sortField === 'new') {
      result.sort((a, b) => (getNewest(a) - getNewest(b)) * dir);
    }

    return result;
  }, [filteredProducts, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / itemsPerPage));
  const paginatedOffers = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedProducts.slice(start, end);
  }, [sortedProducts, page]);

  // Clamp page when results shrink (e.g. after search)
  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(1);
  }, [totalPages, page]);

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
  const serviceOfferTypes = data.service_offer_types || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">

      {serviceOfferTypes.length > 1 && (
        <OfferTypeTabs currentSlug={offerType.slug} offerTypes={serviceOfferTypes} />
      )}

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{offerType.name}</h1>
      {offerType.description && (
        <p className="text-gray-600 mb-6 max-w-2xl">{offerType.description}</p>
      )}

      {/* Sticky search + sort bar */}
      <div className="py-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search offers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-m4m-purple focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-m4m-purple focus:border-transparent"
            >
              <option value="sales">Most sells</option>
              <option value="price">Price</option>
              <option value="rating">Rating</option>
              <option value="delivery">Delivery time</option>
              <option value="new">Newest</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-m4m-purple focus:border-transparent"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">
          {sortedProducts.length} seller{sortedProducts.length !== 1 ? 's' : ''} offering this service
        </p>
      </div>

      {/* Grid / empty state */}
      {Array.isArray(sortedProducts) && sortedProducts.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500 mb-2">No offers found</p>
          <p className="text-xs text-gray-400">Try adjusting your search or sort options.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedOffers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-m4m-purple focus:ring-offset-1"
              >
                Prev
              </button>
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-m4m-purple focus:ring-offset-1"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
