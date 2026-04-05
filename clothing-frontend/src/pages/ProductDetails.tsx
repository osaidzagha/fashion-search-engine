import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Product } from "../types"; // Adjust path if needed
import { fetchProductById } from "../services/api";
import { Spinner } from "../components/Spinner";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();

  // 1. Set up your state here (product and isLoading)
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 2. Set up your useEffect here to fetch the data
  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;

      setIsLoading(true);
      const fetchedProduct = await fetchProductById(id!);
      setProduct(fetchedProduct);
      setIsLoading(false);
    };

    loadProduct();
  }, [id]);

  // if (isLoading) return ...
  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );

  // if (!product) return ...
  if (!product)
    return (
      <div className="text-center mt-20">
        <h2 className="text-2xl font-bold">Product Not Found</h2>
        <Link
          to="/"
          className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-md text-center hover:bg-gray-800 transition"
        >
          Back to Search
        </Link>
      </div>
    );
  // 5. The Real UI
  return (
    <div className="max-w-6xl mx-auto p-8 mt-10 flex flex-col md:flex-row gap-10">
      {/* Left Column: Image (Now wrapped in the external link!) */}
      <div className="md:w-1/2">
        <a
          href={product.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <img
            src={
              product.images && product.images.length > 0
                ? product.images[0]
                : ""
            }
            alt={product.name}
            className="w-full rounded-lg shadow-md group-hover:opacity-90 transition-opacity"
          />
        </a>
      </div>

      {/* Right Column: Details */}
      <div className="md:w-1/2 flex flex-col justify-center">
        <p className="text-gray-500 uppercase tracking-wide">{product.brand}</p>
        <h1 className="text-3xl font-bold mt-2">{product.name}</h1>
        <p className="text-2xl mt-4 font-semibold">
          {product.price} {product.currency}
        </p>

        {/* Sizes Mapping */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mt-6">
            <p className="font-semibold text-sm text-gray-700 mb-2 uppercase tracking-wider">
              Available Sizes
            </p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size, index) => (
                <span
                  key={index}
                  className="border border-gray-300 px-4 py-2 text-sm rounded-sm hover:border-black transition-colors"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Scraped Details */}
        {product.description && (
          <p className="mt-8 text-gray-700 leading-relaxed">
            {product.description}
          </p>
        )}

        {product.composition && product.composition !== "Unknown" && (
          <p className="mt-4 text-sm text-gray-500 bg-gray-50 p-4 rounded-md">
            <span className="font-semibold">Composition:</span>{" "}
            {product.composition}
          </p>
        )}

        {/* External Link Button */}
        <a
          href={product.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 block w-full bg-black text-white px-6 py-4 rounded-md text-center font-bold tracking-widest uppercase hover:bg-gray-800 transition shadow-lg"
        >
          View on {product.brand}
        </a>

        {/* Keep the Back link just as a subtle text option below */}
        <Link
          to="/"
          className="mt-4 text-center text-gray-500 text-sm hover:text-black underline transition-colors"
        >
          &larr; Back to Search
        </Link>
      </div>
    </div>
  );
}
