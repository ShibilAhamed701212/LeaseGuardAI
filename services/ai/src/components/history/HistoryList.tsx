import { useEffect, useState } from "react";
import { getDocumentSummaries, deleteDocument } from "../../services/storage";
import type { DocumentSummary } from "../../services/storage/types";
import { truncate } from "../../utils/helpers";
import styles from "./HistoryList.module.css";

export function HistoryList({ onSelect }: { onSelect: (job_id: string) => void }) {
  const [items, setItems] = useState<DocumentSummary[]>([]);
  const [busy,  setBusy]  = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setBusy(true);
    try { setItems(await getDocumentSummaries()); }
    finally { setBusy(false); }
  }

  async function handleDelete(job_id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteDocument(job_id);
    load();
  }

  if (busy)          return <p className={styles.empty}>Loading…</p>;
  if (!items.length) return <p className={styles.empty}>No history yet. Analyse a document to get started.</p>;

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.job_id} className={styles.item} onClick={() => onSelect(item.job_id)}>
          <div className={styles.info}>
            <div className={styles.left}>
              <span className={styles.id}>{truncate(item.job_id, 24)}</span>
              {item.make && <span className={styles.vehicle}>{item.year} {item.make} {item.model}</span>}
              <span className={styles.date}>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            {item.fairness_score !== null && (
              <span className={styles.score} style={{
                color: item.fairness_score >= 70 ? "var(--success)"
                     : item.fairness_score >= 40 ? "var(--warning)" : "var(--danger)"
              }}>{item.fairness_score}/100</span>
            )}
          </div>
          <button className={styles.del} onClick={(e) => handleDelete(item.job_id, e)} title="Delete">✕</button>
        </li>
      ))}
    </ul>
  );
}