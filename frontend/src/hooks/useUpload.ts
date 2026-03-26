import { useState, useCallback } from "react";
import { uploadFile } from "../services/api";
import { friendlyError, trackError, trackUserAction } from "../utils/helpers";

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
    trackUserAction('upload_file', { fileName: file.name, fileSize: file.size });
    try {
      const { job_id } = await uploadFile(file);
      trackUserAction('upload_complete', { job_id });
      return job_id;
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg);
      trackError(msg, undefined, { fileName: file.name }, 'useUpload');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { upload, loading, error, reset };
}
