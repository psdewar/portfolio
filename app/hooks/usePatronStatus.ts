import { useState, useEffect } from "react";
import { useDevTools } from "../contexts/DevToolsContext";

export function usePatronStatus() {
  const { simulatePatron } = useDevTools();
  const [isPatron, setIsPatron] = useState(false);

  useEffect(() => {
    const status = localStorage.getItem("patronStatus");
    const email = localStorage.getItem("patronEmail");
    setIsPatron((status === "active" && !!email) || simulatePatron);
  }, [simulatePatron]);

  return isPatron;
}
