import { useEffect, useState } from "react";
import { getAllResults, deleteResult } from "../../services/storage";
import type { ResultPayload } from "../../services/api";
import { truncate } from "../../utils/helpers";
import styles from "./HistoryList.module.css";

export function HistoryList({ onSelect }: { onSelect: (r: ResultPayload) => void }) {
  const [items, setItems] = useState<ResultPayload[]>([]);
  const [busy,  setBusy]  = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setBusy(true);
    setItems([...(await getAllResults())].reverse());
    setBusy(false);
  }

  async function handleDelete(job_id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteResult(job_id);
    load();
  }

  if (busy)          return <p className={styles.empty}>Loading…</p>;
  if (!items.length) return <p className={styles.empty}>No history yet. Analyse a document to get started.</p>;

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.job_id} className={styles.item} onClick={() => onSelect(item)}>
          <div className={styles.info}>
            <span className={styles.id}>{truncate(item.job_id, 28)}</span>
            {item.fairness_score !== null && (
              <span className={styles.score} style={{
                color: item.fairness_score >= 70 ? "var(--success)" : item.fairness_score >= 40 ? "var(--warning)" : "var(--danger)"
              }}>{item.fairness_score}/100</span>
            )}
          </div>
          <button className={styles.del} onClick={(e) => handleDelete(item.job_id, e)} title="Delete">✕</button>
        </li>
      ))}
    </ul>
  );
}
