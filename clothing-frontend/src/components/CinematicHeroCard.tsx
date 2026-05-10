import { Product } from "../types";

interface CinematicHeroCardProps {
  product: Product;
}

export default function CinematicHeroCard({ product }: CinematicHeroCardProps) {
  return (
    <div
      onClick={() => (window.location.href = `/product/${product.id}`)}
      className="relative w-[300px] h-[530px] overflow-hidden group cursor-pointer bg-black"
    >
      {/* The Video */}
      <video
        src={product.videos?.[0]}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105 opacity-90 group-hover:opacity-100"
      />

      {/* The Luxury Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-500" />

      {/* The Typography */}
      <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col gap-3 transform translate-y-2 transition-transform duration-500 group-hover:translate-y-0 z-10">
        <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-white/70">
          {product.brand}
        </span>
        <h3 className="font-heading font-light text-2xl text-white leading-tight">
          {product.name}
        </h3>
        <span className="font-sans text-[10px] tracking-widest uppercase text-white opacity-0 transition-opacity duration-500 group-hover:opacity-100 mt-2">
          Discover →
        </span>
      </div>
    </div>
  );
}
