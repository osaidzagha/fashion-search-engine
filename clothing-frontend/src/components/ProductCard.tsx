import { Product } from "../types";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="group border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-white">
      {/* IMAGE SECTION */}
      <div className="relative aspect-[3/4] w-full bg-gray-100 overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* DETAILS SECTION */}
      <div className="p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          {product.brand}
        </p>

        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">
            {product.price} {product.currency}
          </p>

          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800 transition-colors"
          >
            View
          </a>
        </div>
      </div>
    </div>
  );
};
