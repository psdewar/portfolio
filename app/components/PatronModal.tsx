"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { PatronContent } from "./PatronContent";

interface PatronModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PatronModal({ isOpen, onClose }: PatronModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex-1 m-4 sm:m-8 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <PatronContent isModal onClose={onClose} />
      </div>
    </div>,
    document.body
  );
}
