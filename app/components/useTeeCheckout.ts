"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import posthog from "posthog-js";

export const SIZE_LABELS: Record<string, string> = {
  XS: "Extra Small",
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Extra Large",
};

interface Selection {
  colorId: string;
  prevColorId: string;
  size: string;
}

interface SelectionStore {
  sel: Selection;
  listeners: Set<() => void>;
}

const stores = new Map<string, SelectionStore>();

function getStore(productId: string, init: Selection): SelectionStore {
  let store = stores.get(productId);
  if (!store) {
    store = { sel: init, listeners: new Set() };
    stores.set(productId, store);
  }
  return store;
}

interface Options {
  productId: string;
  colors: readonly { id: string }[];
  sizes: readonly string[];
  defaultSize: string;
  embedded: boolean;
  event: string;
  errorText: string;
}

export function useTeeCheckout({
  productId,
  colors,
  sizes,
  defaultSize,
  embedded,
  event,
  errorText,
}: Options) {
  const store = getStore(productId, {
    colorId: colors[0].id,
    prevColorId: colors[0].id,
    size: defaultSize,
  });

  const subscribe = useCallback(
    (onChange: () => void) => {
      store.listeners.add(onChange);
      return () => store.listeners.delete(onChange);
    },
    [store],
  );
  const sel = useSyncExternalStore(
    subscribe,
    () => store.sel,
    () => store.sel,
  );

  const update = useCallback(
    (patch: Partial<Selection>) => {
      store.sel = { ...store.sel, ...patch };
      store.listeners.forEach((l) => l());
    },
    [store],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const colorKey = `${productId}-color`;
  const sizeKey = `${productId}-size`;

  useEffect(() => {
    const c = sessionStorage.getItem(colorKey);
    const s = sessionStorage.getItem(sizeKey);
    const patch: Partial<Selection> = {};
    if (c && c !== store.sel.colorId && colors.some((x) => x.id === c)) {
      patch.colorId = c;
      patch.prevColorId = c;
    }
    if (s && s !== store.sel.size && sizes.includes(s)) patch.size = s;
    if (Object.keys(patch).length) update(patch);
  }, [colorKey, sizeKey, colors, sizes, store, update]);

  const selectColor = (id: string) => {
    if (id === sel.colorId) return;
    update({ prevColorId: sel.colorId, colorId: id });
  };

  const setSize = (size: string) => update({ size });

  const sizeLabel = SIZE_LABELS[sel.size] ?? sel.size;

  const start = () => {
    if (!sel.size || loading) return;
    sessionStorage.setItem(colorKey, sel.colorId);
    sessionStorage.setItem(sizeKey, sel.size);
    posthog.capture(event, { product: productId, color: sel.colorId, size: sel.size });
    setShowOptions(true);
  };

  const trackCheckout = (method: "venmo" | "card") => {
    if (!sel.size || loading) return false;
    sessionStorage.setItem(colorKey, sel.colorId);
    sessionStorage.setItem(sizeKey, sel.size);
    posthog.capture(event, { product: productId, color: sel.colorId, size: sel.size, method });
    return true;
  };

  const startCard = async () => {
    if (loading) return;
    setShowOptions(false);
    if (embedded) {
      setShowCheckout(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          metadata: { color: sel.colorId, size: sizeLabel },
        }),
      });
      const { url, error: serverError } = await res.json();
      if (serverError || !url) throw new Error(serverError || "Checkout unavailable");
      window.location.href = url;
    } catch {
      setError(errorText);
      setLoading(false);
    }
  };

  return {
    colorId: sel.colorId,
    prevColorId: sel.prevColorId,
    size: sel.size,
    sizeLabel,
    loading,
    error,
    showOptions,
    showCheckout,
    selectColor,
    setSize,
    start,
    startCard,
    trackCheckout,
    closeOptions: () => setShowOptions(false),
    closeCheckout: () => setShowCheckout(false),
  };
}
