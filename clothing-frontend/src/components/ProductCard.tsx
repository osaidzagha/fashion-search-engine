import { Product } from "../types"; // Or wherever your type is
import { Link } from "react-router-dom";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    // We wrap the whole card in a Link so the entire thing is clickable!
    <Link to={`/product/${product.id}`} className="group cursor-pointer">
      <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
        {/* Your existing image code */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-80 object-cover group-hover:opacity-90 transition"
        />

        {/* Your existing text code */}
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
          <h3 className="font-semibold text-sm truncate">{product.name}</h3>
          <p className="mt-2 font-bold">
            {product.price} {product.currency}
          </p>
        </div>
      </div>
    </Link>
  );
};
