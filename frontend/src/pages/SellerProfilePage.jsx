import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { isSellerOnline } from '../lib/sellerOnline';
import { apiFetch, paginatedItems } from '../lib/api';

export default function SellerProfilePage() {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const data = await apiFetch(`/products?seller_id=${id}`);
        const list = paginatedItems(data);
        if (!cancelled && Array.isArray(list)) {
          setProducts(list);
          if (list[0]?.seller) setSeller(list[0].seller);
          else setSeller({ id: Number(id), name: 'Seller' });
        } else if (!cancelled) {
          setProducts([]);
          setSeller({ id: Number(id), name: 'Seller' });
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setSeller({ id: Number(id), name: 'Seller' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) fetchData();
    return () => { cancelled = true; };
  }, [id]);

  if (loading && !seller) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-m4m-gray-500">
        Loading seller…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl border border-m4m-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-m4m-purple text-white flex items-center justify-center text-2xl font-bold">
            {seller?.name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-m4m-black">{seller?.name || 'Seller'}</h1>
            <p className="text-m4m-gray-500 mt-1">Seller profile</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ml-auto ${
              isSellerOnline(seller) ? 'bg-green-100 text-green-800' : 'bg-m4m-gray-100 text-m4m-gray-600'
            }`}
            title={isSellerOnline(seller) ? 'Seller is online' : 'Seller is offline'}
          >
            <span
              className={`w-2 h-2 rounded-full ${isSellerOnline(seller) ? 'bg-green-500' : 'bg-m4m-gray-400'}`}
              aria-hidden
            />
            {isSellerOnline(seller) ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-m4m-black mb-4">Listings</h2>
        {loading ? (
          <p className="text-m4m-gray-500">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-m4m-gray-500">No products listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={{ ...p, seller }} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
