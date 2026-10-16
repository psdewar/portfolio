import { useEffect, useRef } from "react";

export function useBackToClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let popped = false;
    window.history.pushState({ ...window.history.state, backToClose: true }, "");
    const onPop = () => {
      popped = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!popped && window.history.state?.backToClose) window.history.back();
    };
  }, [open]);
}
