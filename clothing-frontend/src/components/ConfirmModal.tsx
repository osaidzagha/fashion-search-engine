import React, { useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bgPrimary/80 dark:bg-bgPrimary-dark/80 backdrop-blur-sm px-6">
      <div
        className="w-full max-w-sm bg-bgPrimary dark:bg-bgPrimary-dark border border-borderLight dark:border-borderLight-dark p-8 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        <h3 className="font-heading font-light text-2xl text-textPrimary dark:text-textPrimary-dark mb-3">
          {title}
        </h3>
        <p className="font-sans text-[11px] leading-relaxed text-textTertiary dark:text-textTertiary-dark mb-8">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 font-sans text-[9px] tracking-widest uppercase border border-borderLight dark:border-borderLight-dark text-textPrimary dark:text-textPrimary-dark hover:bg-borderLight dark:hover:bg-borderLight-dark transition-colors duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 font-sans text-[9px] tracking-widest uppercase border transition-colors duration-200 ${
              isDestructive
                ? "border-accentRed bg-accentRed text-white hover:bg-red-700 hover:border-red-700"
                : "border-textPrimary dark:border-textPrimary-dark bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark hover:opacity-80"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
