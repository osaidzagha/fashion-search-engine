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
      {/* Left Column: Image */}
      <div className="md:w-1/2">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full rounded-lg shadow-md"
        />
      </div>

      {/* Right Column: Details */}
      <div className="md:w-1/2 flex flex-col justify-center">
        <p className="text-gray-500 uppercase tracking-wide">{product.brand}</p>
        <h1 className="text-3xl font-bold mt-2">{product.name}</h1>
        <p className="text-2xl mt-4 font-semibold">
          {product.price} {product.currency}
        </p>

        {/* You can map over product.sizes here to create buttons! */}

        <p className="mt-8 text-gray-700">{product.description}</p>
        <p className="mt-4 text-sm text-gray-500">
          Composition: {product.composition}
        </p>

        <Link
          to="/"
          className="mt-10 inline-block bg-black text-white px-6 py-3 rounded-md text-center hover:bg-gray-800 transition"
        >
          Back to Search
        </Link>
      </div>
    </div>
  );
}
