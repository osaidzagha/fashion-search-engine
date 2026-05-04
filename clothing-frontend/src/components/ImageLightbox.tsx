import { useEffect } from "react";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  setIndex: (index: number) => void;
}

export const ImageLightbox = ({
  images,
  currentIndex,
  onClose,
  setIndex,
}: ImageLightboxProps) => {
  // Allow keyboard navigation for a better UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((currentIndex + 1) % images.length);
      if (e.key === "ArrowLeft")
        setIndex((currentIndex - 1 + images.length) % images.length);
    };

    // Lock background scrolling when lightbox is open
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex, images.length, onClose, setIndex]);

  if (!images || images.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#faf9f6", // Clean off-white luxury background
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "32px",
          right: "40px",
          background: "none",
          border: "none",
          fontSize: "11px",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.15em",
          color: "#1a1a1a",
          zIndex: 10000,
        }}
      >
        CLOSE
      </button>

      {/* Prev Button */}
      <button
        onClick={() =>
          setIndex((currentIndex - 1 + images.length) % images.length)
        }
        style={{
          position: "absolute",
          left: "40px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "20px",
          zIndex: 10000,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1"
          strokeLinecap="square"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Main Image */}
      <img
        src={images[currentIndex]}
        alt={`Product view ${currentIndex + 1}`}
        style={{ maxHeight: "90vh", maxWidth: "80vw", objectFit: "contain" }}
      />

      {/* Next Button */}
      <button
        onClick={() => setIndex((currentIndex + 1) % images.length)}
        style={{
          position: "absolute",
          right: "40px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "20px",
          zIndex: 10000,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1"
          strokeLinecap="square"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
};
