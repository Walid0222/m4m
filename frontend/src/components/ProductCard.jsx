import { Link } from 'react-router-dom';
import { isSellerOnline } from '../lib/sellerOnline';

export default function ProductCard({ product }) {
  const {
    id,
    name,
    price,
    seller,
    rating,
  } = product;
  const sellerName = seller?.name ?? 'Seller';
  const online = isSellerOnline(seller);
  const displayRating = typeof rating === 'number' ? rating : parseFloat(rating) || 0;

  return (
    <article className="bg-white rounded-xl border border-m4m-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Product image */}
      <Link to={`/product/${id}`} className="block flex-shrink-0">
        <div className="aspect-[4/3] bg-m4m-gray-100 flex items-center justify-center overflow-hidden">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={name}
              className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-200"
            />
          ) : (
            <span className="text-m4m-gray-500 text-sm">No image</span>
          )}
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1">
        {/* Product title */}
        <h3 className="font-semibold text-m4m-black truncate">
          <Link to={`/product/${id}`} className="hover:text-m4m-purple transition-colors">
            {name}
          </Link>
        </h3>

        {/* Seller name + online indicator */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Link
            to={`/seller/${seller?.id ?? id}`}
            className="text-sm text-m4m-gray-600 hover:text-m4m-purple transition-colors"
          >
            {sellerName}
          </Link>
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
              online ? 'text-green-600' : 'text-m4m-gray-500'
            }`}
            title={online ? 'Seller is online' : 'Seller is offline'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                online ? 'bg-green-500' : 'bg-m4m-gray-400'
              }`}
              aria-hidden
            />
            {online ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Rating */}
        <div className="mt-1.5 flex items-center gap-1" aria-label={`Rating: ${displayRating} out of 5`}>
          <span className="text-amber-500" aria-hidden>
            ★
          </span>
          <span className="text-sm font-medium text-m4m-gray-700">
            {displayRating > 0 ? displayRating.toFixed(1) : '—'}
          </span>
        </div>

        {/* Price + BUY button */}
        <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-m4m-gray-100">
          <p className="text-lg font-bold text-m4m-black">
            ${Number(price).toFixed(2)}
          </p>
          <Link
            to={`/product/${id}`}
            className="flex-shrink-0 px-4 py-2 rounded-lg font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover transition-colors text-sm"
          >
            BUY
          </Link>
        </div>
      </div>
    </article>
  );
}
