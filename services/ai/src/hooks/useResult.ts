import { useState, useCallback } from "react";
import { getResult, cleanup, type ResultPayload } from "../services/api";
import { saveDocument } from "../services/storage";
import type { StoredDocument } from "../services/storage/types";
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

      // Map to StoredDocument and persist locally
      const doc: StoredDocument = {
        job_id:           data.job_id,
        sla:              data.sla,
        vin:              data.vin,
        price_estimate:   data.price_estimate ?? null,
        fairness_score:   data.fairness_score,
        negotiation_tips: data.negotiation_tips,
        created_at:       new Date().toISOString(),
      };
      await saveDocument(doc);

      // Redundant cleanup — backend auto-cleans after result fetch
      await cleanup(job_id).catch(() => null);

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