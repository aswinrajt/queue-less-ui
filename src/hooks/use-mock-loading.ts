import { useEffect, useState } from "react";

/**
 * Simulates a short fetch so screens can show their loading skeletons.
 * Purely presentational — there is no backend in this prototype.
 */
export function useMockLoading(delay = 550) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), delay);
    return () => window.clearTimeout(id);
  }, [delay]);

  return loading;
}
