import { useCallback, useEffect, useState } from "react";
import { store } from "@/lib/store";
import type { Party } from "@/types";

export function useParties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await store.listParties();
      setParties(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load parties");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { parties, loading, error, refetch };
}
