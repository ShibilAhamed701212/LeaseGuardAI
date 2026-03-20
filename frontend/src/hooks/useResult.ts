import { useState, useCallback } from "react";
import { getResult, cleanup, type ResultPayload } from "../services/api";
import { saveResult } from "../services/storage";
import { friendlyError } from "../utils/helpers";

interface UseResultReturn {
  fetch:   (job_id: string) => Promise<ResultPayload | null>;
  result:  ResultPayload | null;
  loading: boolean;
  error:   string | null;
}

export function useResult(): UseResultReturn {
  const [result,  setResult]  = useState<ResultPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async (job_id: string): Promise<ResultPayload | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getResult(job_id);
      await saveResult(data);   // IndexedDB — local storage
      await cleanup(job_id);    // delete server data — privacy
      setResult(data);
      return data;
    } catch (err) {
      setError(friendlyError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetch, result, loading, error };
}
