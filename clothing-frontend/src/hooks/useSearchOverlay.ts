/**
 * useSearchOverlay — lightweight global search overlay state.
 *
 * Uses a custom DOM event ("dope:search-open" / "dope:search-close") so any
 * component can open/close the overlay without prop drilling or Redux.
 *
 * Usage:
 *   const { isOpen, open, close } = useSearchOverlay();
 */
import { useEffect, useState, useCallback } from "react";

const OPEN_EVENT = "dope:search-open";
const CLOSE_EVENT = "dope:search-close";

export function useSearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener(OPEN_EVENT, handleOpen);
    window.addEventListener(CLOSE_EVENT, handleClose);
    return () => {
      window.removeEventListener(OPEN_EVENT, handleOpen);
      window.removeEventListener(CLOSE_EVENT, handleClose);
    };
  }, []);

  const open = useCallback(() => window.dispatchEvent(new Event(OPEN_EVENT)), []);
  const close = useCallback(
    () => window.dispatchEvent(new Event(CLOSE_EVENT)),
    [],
  );

  return { isOpen, open, close };
}
