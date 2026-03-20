import { useState, useCallback } from "react";
import { uploadFile } from "../services/api";
import { friendlyError } from "../utils/helpers";

interface UseUploadReturn {
  upload:  (file: File) => Promise<string | null>;
  loading: boolean;
  error:   string | null;
  reset:   () => void;
}

export function useUpload(): UseUploadReturn {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const reset  = useCallback(() => setError(null), []);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const { job_id } = await uploadFile(file);
      return job_id;
    } catch (err) {
      setError(friendlyError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { upload, loading, error, reset };
}
