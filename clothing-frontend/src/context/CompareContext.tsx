import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Product } from "../types";

interface CompareContextType {
  compareList: Product[];
  overlayOpen: boolean;
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  isInCompare: (productId: string) => boolean;
  openOverlay: () => void;
  closeOverlay: () => void;
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextType | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const addToCompare = useCallback((product: Product) => {
    setCompareList((prev) => {
      // Already in list
      if (prev.find((p) => p.id === product.id)) return prev;
      // Max 2
      if (prev.length >= 2) return prev;
      return [...prev, product];
    });
  }, []);

  const removeFromCompare = useCallback((productId: string) => {
    setCompareList((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const isInCompare = useCallback(
    (productId: string) => compareList.some((p) => p.id === productId),
    [compareList],
  );

  const openOverlay = useCallback(() => {
    document.body.style.overflow = "hidden";
    setOverlayOpen(true);
  }, []);

  const closeOverlay = useCallback(() => {
    document.body.style.overflow = "";
    setOverlayOpen(false);
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
    document.body.style.overflow = "";
    setOverlayOpen(false);
  }, []);

  return (
    <CompareContext.Provider
      value={{
        compareList,
        overlayOpen,
        addToCompare,
        removeFromCompare,
        isInCompare,
        openOverlay,
        closeOverlay,
        clearCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare(): CompareContextType {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used inside <CompareProvider>");
  return ctx;
}
