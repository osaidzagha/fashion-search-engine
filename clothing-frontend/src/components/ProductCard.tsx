import { Product } from "../types"; // Or wherever your type is
import { Link } from "react-router-dom";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    // We wrap the whole card in a Link so the entire thing is clickable!
    <Link to={`/product/${product.id}`} className="block group">
      <div className="relative overflow-hidden aspect-[3/4] bg-gray-100 rounded-md">
        {/* 1. Default Image (The Model Shot) */}
        {product.images && product.images.length > 0 && (
          <img
            src={product.images[0]}
            alt={product.name}
            // Only apply the fade-out hover effect IF we actually have a second image
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${product.images.length > 1 ? "group-hover:opacity-0" : ""}`}
          />
        )}

        {/* 2. Hover Image (Use the 2nd image, NOT the last image) */}
        {product.images && product.images.length > 1 && (
          <img
            src={product.images[1]}
            alt={`${product.name} detail`}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out opacity-0 group-hover:opacity-100"
          />
        )}
      </div>

      <div className="mt-3">
        <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider">
          {product.brand}
        </h3>
        <p className="font-medium truncate">{product.name}</p>
        <p className="mt-1 font-bold">
          {product.price} {product.currency}
        </p>
      </div>
    </Link>
  );
};
