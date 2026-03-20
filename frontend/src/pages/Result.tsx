import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ResultCard } from "../components/result/ResultCard";
import { Loader }     from "../components/shared/Loader";
import { useResult }  from "../hooks/useResult";
import styles from "./Result.module.css";

export function Result() {
  const { job_id }  = useParams<{ job_id: string }>();
  const navigate    = useNavigate();
  const { fetch, result, loading, error } = useResult();

  useEffect(() => { if (job_id) fetch(job_id); }, [job_id]);

  if (loading) return (
    <main className="page"><Loader size="lg" message="Fetching result and saving locally…" /></main>
  );

  if (error) return (
    <main className="page">
      <div className={styles.errBox}>
        <h2>Could not load result</h2>
        <p>{error}</p>
        <div className={styles.errActions}>
          <button className="btn-primary" onClick={() => job_id && fetch(job_id)}>Retry</button>
          <button className="btn-ghost"   onClick={() => navigate("/upload")}>New Analysis</button>
        </div>
      </div>
    </main>
  );

  if (!result) return null;

  return (
    <main className="page">
      <div className={styles.header}>
        <h1 className={styles.title}>Analysis Complete</h1>
        <p className={styles.jobId}><span>Job:</span> {result.job_id}</p>
      </div>
      <ResultCard result={result} />
      <div className={styles.actions}>
        <button className="btn-primary" onClick={() => navigate("/upload")}>Analyse Another →</button>
        <button className="btn-ghost"   onClick={() => navigate("/history")}>View History</button>
      </div>
    </main>
  );
}
