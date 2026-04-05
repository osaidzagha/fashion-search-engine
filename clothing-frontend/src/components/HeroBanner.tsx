import { useDispatch } from "react-redux";
import { setSearchTerm } from "../store/productSlice";

export function HeroBanner() {
  const dispatch = useDispatch();

  const handleShopNow = () => {
    // When they click the banner, let's automatically search for a cool item
    dispatch(setSearchTerm("cotton"));
  };

  return (
    <div className="relative w-full h-[50vh] md:h-[60vh] bg-gray-900 overflow-hidden mb-8">
      {/* 1. Background Image (Using a high-end fashion placeholder) */}
      <img
        src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop"
        alt="Hero Campaign"
        className="absolute inset-0 w-full h-full object-cover opacity-70"
      />

      {/* 2. Text Content over the image */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-widest mb-4">
          The New Collection
        </h2>
        <p className="text-lg text-gray-200 mb-8 max-w-lg">
          Explore the latest minimalist essentials and tailored outerwear.
        </p>

        {/* 3. The Call to Action Button */}
        <button
          onClick={handleShopNow}
          className="bg-white text-black px-8 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors"
        >
          Discover Now
        </button>
      </div>
    </div>
  );
}
