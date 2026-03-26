import { useState, useCallback } from 'react';
import { getResult, type ResultPayload } from '../services/api';
import { saveDocument } from '../services/storage';
import type { StoredDocument } from '../services/storage/types';
import { friendlyError, trackError, trackUserAction } from '../utils/helpers';

export function useResult() {
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (job_id: string): Promise<ResultPayload | null> => {
    setLoading(true);
    setError(null);
    trackUserAction('fetch_result', { job_id });
    try {
      const data = await getResult(job_id);
      const doc: StoredDocument = {
        job_id: data.job_id,
        sla: {
          apr: data.sla.apr ?? null,
          monthly_payment: data.sla.monthly_payment ?? null,
          term: data.sla.term ?? null,
          term_months: data.sla.term_months ?? null,
          total_cost: data.sla.total_cost ?? null,
          residual_value: typeof data.sla.residual_value === 'number' ? data.sla.residual_value : null,
          mileage_limit: data.sla.mileage_limit ?? null,
          penalties: data.sla.penalties
        },
        vin: data.vin ? {
          vin: data.vin.vin,
          make: data.vin.make,
          model: data.vin.model,
          year: data.vin.year
        } : null,
        price_estimate: data.price_estimate ? {
          market_value: data.price_estimate.market_value,
          confidence: data.price_estimate.confidence,
          currency: data.price_estimate.currency
        } : null,
        fairness_score: data.fairness_score,
        negotiation_tips: data.negotiation_tips,
        created_at: new Date().toISOString()
      };
      await saveDocument(doc);
      setResult(data);
      trackUserAction('result_fetched', { job_id });
      return data;
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg);
      trackError(msg, undefined, { job_id }, 'useResult');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetch, result, loading, error };
}
