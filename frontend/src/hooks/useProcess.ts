import { useState, useCallback, useRef } from "react";
import { processDocument, getStatus, type JobStatus } from "../services/api";
import { friendlyError } from "../utils/helpers";

interface UseProcessReturn {
  trigger:  (job_id: string, ocr: string, ai: string) => Promise<void>;
  status:   JobStatus | null;
  loading:  boolean;
  error:    string | null;
}

const POLL_MS   = 2000;
const MAX_POLLS = 90;

export function useProcess(onComplete: () => void): UseProcessReturn {
  const [status,  setStatus]  = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  };

  const trigger = useCallback(async (job_id: string, ocr: string, ai: string) => {
    setLoading(true);
    setError(null);
    try {
      await processDocument(job_id, ocr, ai);
      setStatus("processing");
      let polls = 0;
      timer.current = setInterval(async () => {
        polls++;
        try {
          const { status: s } = await getStatus(job_id);
          setStatus(s);
          if (s === "completed") { stop(); setLoading(false); onComplete(); }
          if (s === "failed")    { stop(); setLoading(false); setError("Processing failed on server."); }
          if (polls >= MAX_POLLS){ stop(); setLoading(false); setError("Processing timed out. Please retry."); }
        } catch (e) { stop(); setLoading(false); setError(friendlyError(e)); }
      }, POLL_MS);
    } catch (err) {
      setLoading(false);
      setError(friendlyError(err));
    }
  }, [onComplete]);

  return { trigger, status, loading, error };
}